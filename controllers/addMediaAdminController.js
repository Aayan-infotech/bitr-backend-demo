import mongoose from 'mongoose';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs/promises';
import path from 'path';
import AddMediaAdmin from '../models/addMediaAdminModel.js';
import RegisterClass from '../models/registerClassModel.js';
import User from '../models/User.js';
import Notification from '../models/notificationModel.js';
import admin from '../config/firebaseConfig.js';

ffmpeg.setFfprobePath(ffprobeStatic.path);

const TMP_DIR = path.resolve('tmp');
await fs.mkdir(TMP_DIR, { recursive: true });

async function saveBufferLocally(file, subfolder = 'media') {
  const ROOT = process.cwd();
  const safe = (s = '') => String(s).replace(/[^a-z0-9-_.]/gi, '_');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const base = path.basename(file.originalname || 'video', ext);
  const name = `${safe(base)}_${Date.now()}${ext || ''}`;
  const dir = path.join(ROOT, 'upload', subfolder);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, name);
  await fs.writeFile(dest, file.buffer);
  return { absPath: dest, relPath: `localupload/${subfolder}/${name}` }; 
} 

async function tryDeleteLocal(relPath) {
  try {
    if (!relPath || typeof relPath !== 'string') return;
    if (!relPath.startsWith('localupload/')) return;
    const diskPath = relPath.replace(/^localupload\//, 'upload/'); 
    const abs = path.join(process.cwd(), diskPath);
    await fs.unlink(abs);
  } catch {
  }
} 

function toAbsoluteUrl(req, relPath) {
  return `${req.protocol}://${req.get('host')}/${relPath}`;
} 
export const addMedia = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, uploadLink = '', Description } = req.body;

    if (!classId || !title || !Description) {
      return res.status(400).json({
        success: false,
        message: 'classId (param), title, and Description are required.',
      });
    } 

    let videoUrl = '';

    if (req.file) {
      const tmpPath = path.join(TMP_DIR, `${Date.now()}-${req.file.originalname}`);
      await fs.writeFile(tmpPath, req.file.buffer);

      let metadata = null;
      try {
        metadata = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(tmpPath, (err, data) => (err ? reject(err) : resolve(data)));
        });
      } finally {
        try { await fs.unlink(tmpPath); } catch {}
      } 

      const duration = Number(metadata?.format?.duration || 0);
      if (!Number.isFinite(duration)) {
        return res.status(400).json({ success: false, message: 'Unable to read video metadata.' });
      } 
      if (duration > 120) {
        return res.status(400).json({
          success: false,
          message: 'Your video exceeds 2 minutes. Please provide a YouTube link instead.',
        });
      } 

      const { relPath } = await saveBufferLocally(req.file, 'media');
      videoUrl = relPath;
    } else {
      if (!uploadLink) {
        return res.status(400).json({
          success: false,
          message: 'Either uploadVideo (≤2m) or uploadLink is required.',
        });
      } 
      const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/i;
      if (!ytRegex.test(uploadLink)) {
        return res.status(400).json({ success: false, message: 'Invalid YouTube link format.' });
      } 
    }

    const media = new AddMediaAdmin({
      classId,
      title,
      uploadVideo: videoUrl || undefined,
      uploadLink: req.file ? undefined : uploadLink,
      Description,
    });
    const saved = await media.save(); 

    const data = saved.toObject();
    if (data.uploadVideo) {
      data.uploadVideo = toAbsoluteUrl(req, data.uploadVideo);
    } 
    const directMediaURL = data.uploadVideo || data.uploadLink;
    const regClass = await RegisterClass.findOne({ class: classId }).lean();
    const registeredUserIds = regClass ? regClass.registrations.map((r) => r.userId) : []; 

    if (registeredUserIds.length > 0) {
      const users = await User.find({
        _id: { $in: registeredUserIds },
        fcmToken: { $exists: true, $ne: null, $ne: '' },
        notificationStatus: { $ne: false },
      }).lean();

      const titleNotif = '🎬 New Media Added';
      const messageNotif = `A new media titled "${title}" was added to your class. Tap to view.`;
      const htmlContent = `<a href="${directMediaURL}">Watch media</a>`;

      for (const user of users) {
        const pushMessage = {
          token: user.fcmToken,
          notification: { title: titleNotif, body: messageNotif },
          data: {
            mediaId: saved._id.toString(),
            classId: classId.toString(),
            mediaURL: String(directMediaURL || ''),
            html: htmlContent,
            type: 'new_media',
          },
        };
        try {
          await admin.messaging().send(pushMessage);
        } catch (err) {
          console.error(`FCM send error for user ${user._id}:`, err);
        }
      } 

      const notificationDoc = new Notification({
        notificationType: 'new Media',
        template: 'template1',
        title: titleNotif,
        message: messageNotif,
        html: htmlContent,
        classId,
        users: users.map((u) => u._id),
        mediaId: saved._id,
        Date: new Date(),
      });
      await notificationDoc.save();
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('addMedia error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};




export const getAllMedia = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required.' });
    }
    const media = await AddMediaAdmin.find({
      classId,
      status: { $ne: 'Blocked' }
    })
      .populate('classId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: media });
  } catch (err) {
    console.error('getAllMedia error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getMediaById = async (req, res) => {
  try {
    const { classId, mediaId } = req.params;
    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required.' });
    }
    if (!mediaId) {
      return res.status(400).json({ success: false, message: 'mediaId is required.' });
    }

    const media = await AddMediaAdmin.findById(mediaId)
      .populate('classId', 'title');

    if (!media || media.status === 'Blocked') {
      return res.status(404).json({ success: false, message: 'Media not found.' });
    }

    res.status(200).json({ success: true, data: media });
  } catch (err) {
    console.error('getMediaById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteMedia = async (req, res) => {
  try {
    const { classId, mediaId } = req.params;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required.' });
    }

    if (!mediaId) {
      return res.status(400).json({ success: false, message: 'mediaId is required.' });
    }

    const media = await AddMediaAdmin.findByIdAndDelete(mediaId);

    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found.' });
    }

    res.status(200).json({ success: true, message: 'Media deleted successfully.' });
  } catch (err) {
    console.error('deleteMedia error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMedia = async (req, res) => {
  try {
    const { classId, mediaId } = req.params;
    const { title, Description, uploadLink } = req.body;

    if (!classId || !mediaId) {
      return res.status(400).json({
        success: false,
        message: 'classId and mediaId (params) are required.'
      });
    } 

    const updatePayload = {};

    if (typeof title === 'string' && title.trim() !== '') {
      updatePayload.title = title;
    } 
    if (typeof Description === 'string' && Description.trim() !== '') {
      updatePayload.Description = Description;
    }

    if (req.file) {
      await ensureTmp();
      const tmpPath = path.join(TMP_DIR, `${Date.now()}-${req.file.originalname}`);
      await fs.writeFile(tmpPath, req.file.buffer);

      let metadata;
      try {
        metadata = await new Promise((resolve, reject) =>
          ffmpeg.ffprobe(tmpPath, (err, data) => (err ? reject(err) : resolve(data)))
        );
      } finally {
        try { await fs.unlink(tmpPath); } catch {}
      }

      const duration = Number(metadata?.format?.duration || 0);
      if (!Number.isFinite(duration)) {
        return res.status(400).json({
          success: false,
          message: 'Unable to read video metadata.'
        });
      } 
      if (duration > 120) {
        return res.status(400).json({
          success: false,
          message: 'Video exceeds 2 minutes. Please send a YouTube link instead.'
        });
      }

      const existing = await AddMediaAdmin.findOne({ _id: mediaId, classId }).lean();
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Media not found or doesn’t belong to this class.'
        });
      } 

      const { relPath } = await saveBufferLocally(req.file, 'media');
      updatePayload.uploadVideo = relPath;     
      updatePayload.uploadLink = undefined;     
      await tryDeleteLocal(existing.uploadVideo); 
    } else if (uploadLink !== undefined) {
      const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/i;
      if (uploadLink && !ytRegex.test(uploadLink)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid YouTube link format.'
        });
      } 

      const existing = await AddMediaAdmin.findOne({ _id: mediaId, classId }).lean();
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Media not found or doesn’t belong to this class.'
        });
      } 

      await tryDeleteLocal(existing.uploadVideo); 
      updatePayload.uploadLink = uploadLink || undefined; 
      updatePayload.uploadVideo = undefined;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update.'
      });
    }

    const updated = await AddMediaAdmin.findOneAndUpdate(
      { _id: mediaId, classId },
      updatePayload,
      { new: true }
    ); 

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Media not found or doesn’t belong to this class.'
      });
    } 

    const data = updated.toObject();
    if (data.uploadVideo) {
      data.uploadVideo = toAbsoluteUrl(req, data.uploadVideo);
    } 

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('updateMedia error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default { addMedia, getAllMedia, getMediaById, deleteMedia,updateMedia };
