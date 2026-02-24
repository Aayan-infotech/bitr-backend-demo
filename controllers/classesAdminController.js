import mongoose from "mongoose";
import { getClassStatus } from '../utils/time.js';
import ClassesAdmin from '../models/classesAdminModel.js';
import Media from '../models/addMediaAdminModel.js';
import User from "../models/User.js";
import RegisterClass from '../models/registerClassModel.js';
import { generateSessionDates } from "../utils/dateGenerator.js";
import feedbackClass from "../models/classFeedbackModel.js";
import Notes from "../models/addNotesModel.js";
import Journal from "../models/addJournelModel.js";
import moment from 'moment-timezone';
import { saveBufferLocally } from '../utils/localUploader.js';
import path from 'path';
import { promises as fs } from 'fs'; 
import Prisoner from "../models/addPrisonerModel.js";

const TZ = "Asia/Kolkata";

function toAbsoluteUrl(req, relPath) {
  if (/^https?:\/\//i.test(relPath)) {
    return relPath;
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const cleanPath = relPath.replace(/^\/+/, '');
  return `${protocol}://${host}/${cleanPath}`;
}

export const addClass = async (req, res) => {
  try {
    const {
      title,
      theme,
      tags,
      startDate,
      endDate,
      sessionType,
      startTime,
      endTime,
      location,
      Instructor,
      Type,
    } = req.body;

    if (!title || !theme || !startDate || !endDate || !sessionType || !startTime || !endTime || !location || !Instructor || !Type) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Class image is required",
      });
    }

    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/avif",
      "image/heic",
      "image/heif",
    ]);
    const allowedExt = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".svg",
      ".avif",
      ".heic",
      ".heif",
    ]);

    const file = req.file;
    const mime = file.mimetype?.toLowerCase?.() || "";
    const originalName = file.originalname || "";
    const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();

    if (!allowedMimeTypes.has(mime) || !allowedExt.has(ext)) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    const { relPath } = await saveBufferLocally(file, "class");
    const imageUrl = toAbsoluteUrl(req, relPath);

    console.log('Generated image URL:', imageUrl); // Debug log

    const dates = generateSessionDates(new Date(startDate), new Date(endDate), sessionType);
    if (!dates.length) {
      return res.status(400).json({
        success: false,
        message: "No session dates generated",
      });
    }

    const sessions = dates.map(date => ({
      date,
      startTime,
      endTime,
      status: "Active",
    }));

    const newClass = new ClassesAdmin({
      title,
      theme,
      tags: Array.isArray(tags) ? tags : [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      sessionType,
      Image: imageUrl,
      location,
      Instructor,
      Type,
      sessions,
    });

    const saved = await newClass.save();

    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (err) {
    console.error("addClass error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const editClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const payload = req.body;
    const file = req.file;

    const existing = await ClassesAdmin.findById(classId).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const updateData = {};
    const up = (key, transform = v => v) => {
      if (payload[key] !== undefined) {
        updateData[key] = transform(payload[key]);
      }
    };

    up('title');
    up('theme');
    up('tags', v => Array.isArray(v) ? v : (v !== undefined ? [v] : []));
    up('location');
    up('Instructor');
    up('Type');
    up('startDate', v => new Date(v));
    up('endDate', v => new Date(v));
    up('sessionType');
    up('startTime');
    up('endTime');

    if (file) {
      // FIX: Use the same BASE_DIR logic as localUploader
      const BASE_DIR = process.env.NODE_ENV === 'production' 
        ? '/app/uploads'
        : path.join(process.cwd(), 'uploads');

      if (existing.Image && typeof existing.Image === 'string') {
        try {
          const url = new URL(existing.Image);
          if (url.pathname.startsWith('/files/')) {
            const filePath = url.pathname.replace('/files/', '');
            const oldFilePath = path.join(BASE_DIR, filePath);
            await fs.unlink(oldFilePath);
            console.log('Deleted old file:', oldFilePath);
          }
        } catch (error) {
          console.log('Could not delete old file:', error.message);
        }
      }

      const { relPath } = await saveBufferLocally(file, 'class');
      updateData.Image = toAbsoluteUrl(req, relPath);
    }

    const schedulingKeys = ['startDate', 'endDate', 'sessionType', 'startTime', 'endTime'];
    const touched = schedulingKeys.some(k => payload[k] !== undefined);

    if (touched) {
      const sDate = updateData.startDate || existing.startDate;
      const eDate = updateData.endDate || existing.endDate;
      const sType = updateData.sessionType || existing.sessionType;
      const sTime = updateData.startTime || existing.startTime;
      const eTime = updateData.endTime || existing.endTime;

      const dates = generateSessionDates(sDate, eDate, sType);
      if (!dates.length) {
        return res.status(400).json({
          success: false,
          message: "No session dates generated with the provided schedule"
        });
      }

      updateData.sessions = dates.map(date => ({
        date,
        startTime: sTime,
        endTime: eTime,
        status: "Active"
      }));
    }

    const updated = await ClassesAdmin.findByIdAndUpdate(
      classId,
      { $set: updateData },
      { new: true }
    );

    const data = updated.toObject();
    if (data.Image) {
      data.Image = toAbsoluteUrl(req, data.Image);
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error editing class:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const blockClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classItem = await ClassesAdmin.findById(classId);

    if (!classItem) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    classItem.status = classItem.status === "Active" ? "Blocked" : "Active";
    await classItem.save();

    res.status(200).json({
      success: true,
      message: `Class status changed to ${classItem.status}`,
      data: classItem,
    });
  } catch (err) {
    console.error("Error toggling class status:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const deletedClass = await ClassesAdmin.findByIdAndDelete(classId);

    if (!deletedClass) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    res.status(200).json({ success: true, message: "Class deleted successfully" });
  } catch (err) {
    console.error("Error deleting class:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const classItem = await ClassesAdmin
      .findById(classId)
      .select("title theme startDate endDate startTime endTime location Instructor Image Type status sessions")
      .populate("location", "location")
      .populate("Instructor", "name")
      .lean();

    if (!classItem) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }

    const now = moment().tz(TZ);
    const startDate = moment(classItem.startDate).tz(TZ);
    const endDate = moment(classItem.endDate).tz(TZ);
    let classStatus = "Upcoming";

    if (now.isBefore(startDate)) {
      classStatus = "Upcoming";
    } else if (now.isAfter(endDate)) {
      classStatus = "Ended";
    } else {
      let hasFutureSession = false;
      let isLive = false;

      for (const sess of classItem.sessions) {
        const sessionDay = moment(sess.date).tz(TZ).format('YYYY-MM-DD');
        const sessionStart = moment.tz(`${sessionDay} ${sess.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
        const sessionEnd = moment.tz(`${sessionDay} ${sess.endTime}`, 'YYYY-MM-DD HH:mm', TZ);

        if (now.isBetween(sessionStart, sessionEnd)) {
          isLive = true;
          break;
        }

        if (sessionStart.isAfter(now)) {
          hasFutureSession = true;
        }
      }

      if (isLive) {
        classStatus = "Live";
      } else if (hasFutureSession) {
        classStatus = "Upcoming";
      } else {
        classStatus = "Ended";
      }
    }

    classItem.mediaCount = await Media.countDocuments({ classId });
    const registerDoc = await RegisterClass.findOne({ class: classId }).lean();

    let userAttendedAllSessions = true;

    if (Array.isArray(classItem.sessions)) {
      classItem.sessions = classItem.sessions.map(sess => {
        const sessionDay = moment(sess.date).tz(TZ).format('YYYY-MM-DD');
        const sessionStart = moment.tz(`${sessionDay} ${sess.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
        const sessionEnd = moment.tz(`${sessionDay} ${sess.endTime}`, 'YYYY-MM-DD HH:mm', TZ);

        let status = "Upcoming";
        if (now.isBetween(sessionStart, sessionEnd)) {
          status = "Live";
        } else if (now.isAfter(sessionEnd)) {
          status = "Ended";
        }

        let registrationCount = 0;
        let presentCount = 0;
        let userPresentInThisSession = false;

        if (registerDoc) {
          registrationCount += registerDoc.registrations.length;

          registerDoc.registrations.forEach(r => {
            if (r.sessionAttendance) {
              r.sessionAttendance.forEach(att => {
                if (att.sessionId?.toString() === sess._id?.toString() && att.status === "Present") {
                  presentCount += 1;

                  if (r.userId.toString() === userId?.toString()) {
                    userPresentInThisSession = true;
                  }
                }
              });
            }
          });

          registerDoc.instructorAttendances?.forEach(inst => {
            if (inst.sessionId?.toString() === sess._id?.toString()) {
              inst.attendanceList?.forEach(att => {
                if (att.status === "Present") {
                  presentCount += 1;
                }
              });
            }
          });
        }

        // Corrected logic: If user missed any session, mark false
        if (!userPresentInThisSession) {
          userAttendedAllSessions = false;
        }

        return {
          ...sess,
          status,
          registrationCount,
          presentCount
        };
      });
    }

    classItem.registrationStatus = false;
    classItem.attendanceMarked = false;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      if (registerDoc) {
        const userReg = registerDoc.registrations.find(
          r => r.userId.toString() === userId.toString()
        );
        if (userReg) {
          classItem.registrationStatus = true;
          if (
            userReg.sessionAttendance &&
            userReg.sessionAttendance.some(sa => sa.status === "Present")
          ) {
            classItem.attendanceMarked = true;
          }
        }
      }
    }

    classItem.generateCertificate = Boolean(userAttendedAllSessions);
    classItem.classStatus = classStatus;

    return res.status(200).json({ success: true, data: classItem });

  } catch (err) {
    console.error("Error fetching class by ID:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};





const getAllClasses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      filterLocation,
      location,
      status,
      type,
      classStatus
    } = req.query;

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const locationId = filterLocation || location;
    if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
      query.location = new mongoose.Types.ObjectId(locationId);
    }

    if (status && ['active', 'blocked'].includes(status.toLowerCase())) {
      query.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    if (type) {
      const typeMap = {
        'regularclass': 'Regular Class',
        'workshop': 'Workshop',
        'specialevent': 'Special Event',
        'regular-class': 'Regular Class',
        'regular class': 'Regular Class',
        'special-event': 'Special Event',
        'special event': 'Special Event',
      };
      const cleanType = type.toLowerCase().replace(/[- ]/g, '');
      const validType = typeMap[cleanType];
      if (validType) {
        query.Type = validType;
      } else if (
        ['Regular Class', 'Workshop', 'Special Event'].includes(type)
      ) {
        query.Type = type;
      }
    }

    let classesDocs = await ClassesAdmin
      .find(query)
      .populate('location', 'location')
      .populate('Instructor', 'name')
      .lean();

    const classIds = classesDocs.map(cls => cls._id);
    const registerDocs = await RegisterClass.find(
      { class: { $in: classIds } },
      { class: 1, registrations: 1, instructorAttendances: 1 }
    ).lean();

    let classesWithExtraInfo = await Promise.all(
      classesDocs.map(async cls => {
        const classIdStr = cls._id.toString();
        const classRegisterDoc = registerDocs.find(reg => reg.class.toString() === classIdStr);
        const registrationCount = classRegisterDoc?.registrations?.length || 0;

        const updatedSessions = (cls.sessions || []).map(session => {
          const sid = session._id?.toString();
          let presentCount = 0;

          classRegisterDoc?.registrations?.forEach(user => {
            const att = user.sessionAttendance?.find(a => a.sessionId?.toString() === sid);
            if (att && att.status === "Present") presentCount += 1;
          });

          const sessionStatus = getClassStatus(session.date, session.startTime, session.endTime);

          return {
            ...session,
            registrationCount,
            presentCount,
            sessionStatus
          };
        });

        const mediaCount = Media
          ? await Media.countDocuments({ classId: cls._id })
          : 0;

        let overallClassStatus = "Upcoming";
        if (updatedSessions.length > 0) {
          const lastSession = updatedSessions.reduce((prev, curr) => {
            const prevEnd = moment(prev.date).tz(TZ).set({
              hour: parseInt(prev.endTime?.split(':')[0] || "0"),
              minute: parseInt(prev.endTime?.split(':')[1] || "0")
            });
            const currEnd = moment(curr.date).tz(TZ).set({
              hour: parseInt(curr.endTime?.split(':')[0] || "0"),
              minute: parseInt(curr.endTime?.split(':')[1] || "0")
            });
            return currEnd.isAfter(prevEnd) ? curr : prev;
          });
          overallClassStatus = getClassStatus(
            lastSession.date,
            lastSession.startTime,
            lastSession.endTime
          );
        }

        return {
          ...cls,
          sessions: updatedSessions,
          mediaCount,
          registrationCount,
          classStatus: overallClassStatus
        };
      })
    );

    // Optional filter by classStatus
    if (classStatus) {
      const filterVals = Array.isArray(classStatus)
        ? classStatus.map(v => String(v).toLowerCase())
        : [String(classStatus).toLowerCase()];
      classesWithExtraInfo = classesWithExtraInfo.filter(c =>
        filterVals.includes(String(c.classStatus).toLowerCase())
      );
    }

    const total = classesWithExtraInfo.length;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const paginatedClasses = classesWithExtraInfo.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginatedClasses,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error("Error fetching all classes:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const getActiveClasses = async (req, res) => {
  try {
    const classes = await ClassesAdmin.find({ status: "Active" }).lean();

    const classesWithCount = await Promise.all(
      classes.map(async cls => {
        const mediaCount = await Media.countDocuments({ classId: cls._id });
        return { ...cls, mediaCount };
      })
    );

    return res.status(200).json({ success: true, data: classesWithCount });
  } catch (err) {
    console.error("Error fetching active classes:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUpcomingClasses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "5", 10));
    const skip = (page - 1) * limit;

    const {
      type,
      filterLocation,
      location
    } = req.query;

    const todayStr = moment().tz(TZ).format("YYYY-MM-DD");
    const nowTime = moment().tz(TZ).format("HH:mm");

    const user = await User.findById(req.user?.id || req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const genericFilter = {
      status: "Active",
      sessions: {
        $elemMatch: {
          $or: [
            { date: { $gt: new Date(todayStr) } },
            {
              $and: [
                { date: new Date(todayStr) },
                { endTime: { $gte: nowTime } }
              ]
            }
          ]
        }
      }
    };

    if (type) {
      const typeMap = {
        'regularclass': 'Regular Class',
        'workshop': 'Workshop',
        'specialevent': 'Special Event',
        'regular-class': 'Regular Class',
        'regular class': 'Regular Class',
        'special-event': 'Special Event',
        'special event': 'Special Event',
      };
      const cleanType = type.toLowerCase().replace(/[- ]/g, '');
      const validType = typeMap[cleanType];
      if (validType) {
        genericFilter.Type = validType;
      } else if (
        ['Regular Class', 'Workshop', 'Special Event'].includes(type)
      ) {
        genericFilter.Type = type;
      }
    }

    const locationId = filterLocation || location;
    if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
      genericFilter.location = new mongoose.Types.ObjectId(locationId);
    }

    const classes = await ClassesAdmin
      .find(genericFilter)
      .sort({ "sessions.date": -1 })
      .select("title theme Image Type startDate Instructor endDate location sessionType sessions")
      .populate('location', 'location')
      .populate("Instructor", "_id name profilePicture")
      .lean();

    const classIds = classes.map(cls => cls._id);

    // NEW: fetch active notes for these classes (same as getMyEvents)
    const notesByClass = await Notes.find({
      classId: { $in: classIds },
      status: "active",
    })
      .select("classId title uploadFile description status")
      .lean();

    const notesMap = {};
    for (const note of notesByClass) {
      const classIdStr = note.classId.toString();
      if (!notesMap[classIdStr]) notesMap[classIdStr] = [];
      notesMap[classIdStr].push(note);
    }

    const registerDocs = await RegisterClass.find({
      class: { $in: classIds }
    }).select("class registrations").lean();

    const registrationMap = {};
    const attendanceMap = {};
    for (const regDoc of registerDocs) {
      registrationMap[regDoc.class.toString()] = regDoc.registrations || [];
      for (const reg of regDoc.registrations || []) {
        attendanceMap[`${regDoc.class.toString()}|${reg.userId.toString()}`] = reg.sessionAttendance || [];
      }
    }

    const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const todayDate = new Date(todayStr);
    const groupedResult = [];
    const dateSet = new Set();

    const sessionIds = [];
    for (const cls of classes) {
      for (const s of (cls.sessions || [])) {
        if (s && s._id) sessionIds.push(s._id);
      }
    }

    let feedbackSessionIds = [];
    if (user._id && sessionIds.length) {
      const feedbackDocs = await feedbackClass.find({
        userId: user._id,
        classId: { $in: classIds },
        sessionId: { $in: sessionIds }
      }).select("sessionId").lean();
      feedbackSessionIds = feedbackDocs.map(doc => String(doc.sessionId));
    }
    const feedbackSessionSet = new Set(feedbackSessionIds);

    function isValidTime(t) {
      return typeof t === "string" && t.includes(":");
    }

    for (const cls of classes) {
      const futureSessions = (cls.sessions || [])
        .filter(session => {
          if (!isValidTime(session.startTime) || !isValidTime(session.endTime)) return false;
          const sessionDate = new Date(session.date);
          if (sessionDate > todayDate) return true;
          if (
            sessionDate.getFullYear() === todayDate.getFullYear() &&
            sessionDate.getMonth() === todayDate.getMonth() &&
            sessionDate.getDate() === todayDate.getDate()
          ) {
            return session.endTime >= nowTime;
          }
          return false;
        })
        .sort((a, b) => {
          const da = new Date(a.date), db = new Date(b.date);
          if (da - db !== 0) return da - db;
          return (a.startTime || '').localeCompare(b.startTime || '');
        });

      const regs = registrationMap[cls._id.toString()] || [];
      let isRegistered = regs.some(r => r.userId?.toString() === user._id.toString());

      const sessionList = futureSessions.map(session => {
        const sessionDateStr = moment(session.date).tz(TZ).format("YYYY-MM-DD");
        const start = moment.tz(`${sessionDateStr} ${session.startTime}`, "YYYY-MM-DD HH:mm", TZ);
        const end = moment.tz(`${sessionDateStr} ${session.endTime}`, "YYYY-MM-DD HH:mm", TZ);

        let sessionStatus = "Upcoming";
        if (moment(istNow).isBetween(start, end, null, '[)')) sessionStatus = "Live";
        else if (moment(istNow).isAfter(end)) sessionStatus = "Ended";

        dateSet.add(sessionDateStr);

        let attendence = null;
        const userAttendances = attendanceMap[`${cls._id.toString()}|${user._id.toString()}`] || [];
        const attendanceObj = userAttendances.find(a => a.sessionId?.toString() === session._id?.toString());
        if (attendanceObj && attendanceObj.status) {
          attendence = attendanceObj.status;
        }

        const feedbackGiven = feedbackSessionSet.has(String(session._id));

        return {
          _id: session._id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          status: sessionStatus,
          classStatus: undefined,
          attendence,
          feedbackGiven
        };
      });

      const endedSessions = (cls.sessions || [])
        .filter(session => {
          return isValidTime(session.startTime) && isValidTime(session.endTime) &&
            (
              new Date(session.date) < todayDate ||
              (
                new Date(session.date).getFullYear() === todayDate.getFullYear() &&
                new Date(session.date).getMonth() === todayDate.getMonth() &&
                new Date(session.date).getDate() === todayDate.getDate() &&
                session.endTime < nowTime
              )
            );
        })
        .sort((a, b) => {
          const da = new Date(a.date), db = new Date(b.date);
          if (db - da !== 0) return db - da; // DESC
          return (b.endTime || '').localeCompare(a.endTime || '');
        });

      let lastSessionAttendence = null;
      if (endedSessions.length > 0) {
        const latestSession = endedSessions[0];
        const userAttendances = attendanceMap[`${cls._id.toString()}|${user._id.toString()}`] || [];
        const attendanceObj = userAttendances.find(a => a.sessionId?.toString() === latestSession._id?.toString());
        if (attendanceObj && attendanceObj.status) {
          lastSessionAttendence = attendanceObj.status;
        } else {
          lastSessionAttendence = null;
        }
      }

      let classStatus = "Ended";
      if (sessionList.length) {
        const anyLive = sessionList.some(session => {
          if (!isValidTime(session.startTime) || !isValidTime(session.endTime)) return false;
          const sessionDate = new Date(session.date);
          const [startHour, startMin] = session.startTime.split(":").map(Number);
          const [endHour, endMin] = session.endTime.split(":").map(Number);

          const startDateTimeIST = new Date(sessionDate);
          startDateTimeIST.setHours(startHour, startMin, 0);

          const endDateTimeIST = new Date(sessionDate);
          endDateTimeIST.setHours(endHour, endMin, 0);

          return istNow >= startDateTimeIST && istNow <= endDateTimeIST;
        });
        if (anyLive) {
          classStatus = "Live";
        } else {
          classStatus = "Upcoming";
        }
      }

      if (sessionList.length) {
        // NEW: attach notes just like getMyEvents
        const classNotes = notesMap[cls._id.toString()] || [];

        groupedResult.push({
          _id: cls._id,
          title: cls.title,
          theme: cls.theme,
          Image: cls.Image,
          Type: cls.Type,
          startDate: cls.startDate,
          endDate: cls.endDate,
          sessionType: cls.sessionType,
          location: cls.location,
          Instructor: cls.Instructor
            ? { _id: cls.Instructor._id, name: cls.Instructor.name, profilePicture: cls.Instructor.profilePicture }
            : null,
          isRegistered,
          classStatus,
          sessions: sessionList,
          lastSessionAttendence,
          notes: classNotes // added
        });
      }
    }

    const paginated = groupedResult.slice(skip, skip + limit);
    const upcomingDates = Array.from(dateSet).sort();

    return res.status(200).json({
      success: true,
      data: {
        user_status: user.user_status,
        classes: paginated,
        dates: upcomingDates,
        page,
        limit,
        totalClasses: groupedResult.length,
        hasMore: skip + limit < groupedResult.length
      }
    });

  } catch (err) {
    console.error("getUpcomingClasses error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};





export const getClassesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '5', 10));
    const skip = (page - 1) * limit;

    const { type: typeParam, location: locationParam } = req.query;

    const targetDate = moment.tz(date, TZ).startOf('day').toDate();
    const nextDate = moment(targetDate).add(1, 'day').toDate();

    const filter = {
      status: 'Active',
      sessions: {
        $elemMatch: {
          date: {
            $gte: targetDate,
            $lt: nextDate
          }
        }
      }
    };

    if (typeParam) filter.Type = typeParam;
    if (locationParam) filter.location = locationParam;

    const totalClasses = await ClassesAdmin.countDocuments(filter);

    const classes = await ClassesAdmin
      .find(filter)
      .select('title theme tags startDate endDate sessionType Image location Instructor Type sessions status')
      .sort({ 'sessions.date': 1 })
      .skip(skip)
      .limit(limit)
      .populate('location', 'location')
      .populate('Instructor', 'name profilePicture')
      .lean();

    const now = moment().tz(TZ);

    const result = classes.map(cls => {
      const sessionOnDate = cls.sessions.find(s =>
        moment(s.date).tz(TZ).isSame(moment(date).tz(TZ), 'day')
      );

      let classStatus = "Upcoming";
      let selectedSession = null;

      if (sessionOnDate) {
        const sessionStart = moment.tz(`${date} ${sessionOnDate.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
        const sessionEnd = moment.tz(`${date} ${sessionOnDate.endTime}`, 'YYYY-MM-DD HH:mm', TZ);

        const sessionStatus = now.isBetween(sessionStart, sessionEnd)
          ? "Live"
          : now.isBefore(sessionStart)
            ? "Upcoming"
            : "Ended";

        classStatus = sessionStatus;

        selectedSession = {
          ...sessionOnDate,
          sessionStatus
        };
      }

      return {
        _id: cls._id,
        title: cls.title,
        theme: cls.theme,
        tags: cls.tags,
        startDate: cls.startDate,
        endDate: cls.endDate,
        sessionType: cls.sessionType,
        Image: cls.Image,
        location: cls.location,
        Instructor: cls.Instructor,
        Type: cls.Type,
        status: cls.status,
        classStatus,
        session: selectedSession
      };
    });

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "No active classes found for this date"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        classes: result,
        page,
        limit,
        totalClasses,
        hasMore: skip + result.length < totalClasses
      }
    });
  } catch (err) {
    console.error("Error fetching classes by date:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getRecommendedClasses = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const user = await User.findById(userId).select("tags location");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = {
      status: "Active",
      location: user.location,
      tags: { $in: user.tags },
      sessions: {
        $elemMatch: { date: { $gte: today } }
      }
    };

    const classes = await ClassesAdmin
      .find(filter)
      .select("title theme Image startDate endDate sessionType location Instructor Type tags sessions")
      .populate("location", "location")
      .populate("Instructor", "name")
      .lean();

    const classesWithStatus = classes.map(cls => ({
      ...cls,
      classStatus: "Upcoming"
    }));

    return res.status(200).json({
      success: true,
      data: classesWithStatus
    });

  } catch (err) {
    console.error("getUpcomingClassesByUserInterest error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const resetUserInterests = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { tags: [] } },
      { new: true }
    ).select("tags");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Tags reset successfully",
      data: updatedUser.tags
    });
  } catch (err) {
    console.error("resetUserTags error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getMyEvents = async (req, res) => {
  try {
    let userId = req.user?.id || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }
    userId = new mongoose.Types.ObjectId(userId);

    // ✅ get registered classes
    const registeredClasses = await RegisterClass.find({
      "registrations.userId": userId,
    }).select("class registrations").lean();

    const classIds = registeredClasses
      .map((rc) => (typeof rc.class === "string" ? new mongoose.Types.ObjectId(rc.class) : rc.class));

    if (!classIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // ✅ get classes
    const classes = await ClassesAdmin.find({ _id: { $in: classIds } })
      .select("title theme startDate endDate sessionType sessions location Instructor Image Type")
      .populate("location", "location")
      .populate("Instructor", "name profilePicture")
      .lean();

    // ✅ get notes
    const notesByClass = await Notes.find({
      classId: { $in: classIds },
      status: "active",
    })
      .select("classId title uploadFile description status")
      .lean();

    const notesMap = {};
    notesByClass.forEach((note) => {
      const classIdStr = note.classId.toString();
      if (!notesMap[classIdStr]) notesMap[classIdStr] = [];
      notesMap[classIdStr].push(note);
    });

    // ✅ get journals
    const journelForClass = await Journal.find({
      userId: userId,
      classId: { $in: classIds },
    })
      .select("classId userId title1 description1 title2 description2 shareWith notes createdAt updatedAt")
      .lean();

    const journelMap = {};
    journelForClass.forEach((journel) => {
      const classIdStr = journel.classId.toString();
      if (!journelMap[classIdStr]) journelMap[classIdStr] = [];
      journelMap[classIdStr].push(journel);
    });

    // ✅ get feedback
    const now = moment().tz(TZ);
    const allSessionIds = [];
    classes.forEach((cls) => {
      if (Array.isArray(cls.sessions)) {
        cls.sessions.forEach((session) => {
          if (session._id) allSessionIds.push(session._id);
        });
      }
    });

    const feedbacks = await feedbackClass.find({
      userId: userId,
      sessionId: { $in: allSessionIds },
    })
      .select("sessionId rating feedback createdAt updatedAt")
      .lean();

    const feedbackMap = {};
    feedbacks.forEach((fb) => {
      feedbackMap[fb.sessionId?.toString()] = fb;
    });

    // ✅ load register docs for attendance
    const registerDocs = await RegisterClass.find({
      class: { $in: classIds }
    }).lean();

    // ✅ build final response
    const results = classes.map((cls) => {
      const classReg = registeredClasses.find((rc) => rc.class.toString() === cls._id.toString());
      const userReg = classReg?.registrations.find((r) => r.userId.toString() === userId.toString());

      const processedSessions = (cls.sessions || []).map((session) => {
        const sessionDate = moment(session.date).tz(TZ).format("YYYY-MM-DD");
        const start = moment.tz(`${sessionDate} ${session.startTime}`, "YYYY-MM-DD HH:mm", TZ);
        const end = moment.tz(`${sessionDate} ${session.endTime}`, "YYYY-MM-DD HH:mm", TZ);

        let sessionStatus = "Upcoming";
        if (now.isBetween(start, end)) sessionStatus = "Live";
        else if (now.isAfter(end)) sessionStatus = "Ended";

        const feedback = feedbackMap[session._id?.toString()] || null;

        // ✅ fix: get correct attendance
        let attendance = "Absent";
        if (userReg && Array.isArray(userReg.sessionAttendance)) {
          const att = userReg.sessionAttendance.find(
            (a) => a.sessionId?.toString() === session._id?.toString()
          );
          if (att) attendance = att.status;
        }

        return {
          _id: session._id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          status: sessionStatus,
          attendance,
          feedback,
          feedbackGiven: !!feedback
        };
      });

      // ✅ class status
      let classStatus = "Ended";
      const todayDateStr = now.format("YYYY-MM-DD");
      const todaySessions = processedSessions.filter(s =>
        moment(s.date).format("YYYY-MM-DD") === todayDateStr
      );

      if (todaySessions.length > 0) {
        if (todaySessions.some(s => s.status === "Live")) {
          classStatus = "Live";
        } else if (todaySessions.some(s => s.status === "Upcoming")) {
          classStatus = "Upcoming";
        } else {
          classStatus = "Ended";
        }
      }

      const classNotes = notesMap[cls._id.toString()] || [];
      const classJournel = journelMap[cls._id.toString()] || [];

      // ✅ certificate eligibility (must attend all sessions)
      let userAttendedAllSessions = true;
      (cls.sessions || []).forEach((sess) => {
        const att = userReg?.sessionAttendance?.find(
          (a) => a.sessionId?.toString() === sess._id?.toString()
        );
        if (!att || att.status !== "Present") {
          userAttendedAllSessions = false;
        }
      });

      return {
        _id: cls._id,
        title: cls.title,
        theme: cls.theme,
        startDate: cls.startDate,
        endDate: cls.endDate,
        sessionType: cls.sessionType,
        location: cls.location,
        Instructor: cls.Instructor,
        Image: cls.Image,
        Type: cls.Type,
        classStatus,
        sessions: processedSessions,
        notes: classNotes,
        journel: classJournel,
        isRegistered: true,
        generateCertificate: Boolean(userAttendedAllSessions)
      };
    });

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("getMyEvents error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getMyClassById = async (req, res) => {
  try {
    let userId = req.user?.id || req.user?._id;
    const { classId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    userId = new mongoose.Types.ObjectId(userId);
    const classObjectId = new mongoose.Types.ObjectId(classId);

    // ✅ check if user is registered
    const registeredClass = await RegisterClass.findOne({
      class: classObjectId,
      "registrations.userId": userId,
    }).select("class registrations").lean();

    if (!registeredClass) {
      return res.status(404).json({ success: false, message: "User not registered for this class" });
    }

    // ✅ fetch class
    const cls = await ClassesAdmin.findById(classObjectId)
      .select("title theme startDate endDate sessionType sessions location Instructor Image Type")
      .populate("location", "location")
      .populate("Instructor", "name profilePicture")
      .lean();

    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    // ✅ notes
    const notes = await Notes.find({
      classId: classObjectId,
      status: "active",
    })
      .select("classId title uploadFile description status")
      .lean();

    // ✅ journel
    const journel = await Journal.find({
      userId,
      classId: classObjectId,
    })
      .select("classId userId title1 description1 title2 description2 shareWith notes createdAt updatedAt")
      .lean();

    // ✅ feedbacks
    const now = moment().tz(TZ);
    const allSessionIds = (cls.sessions || []).map((s) => s._id);

    const feedbacks = await feedbackClass.find({
      userId,
      sessionId: { $in: allSessionIds },
    })
      .select("sessionId rating feedback createdAt updatedAt")
      .lean();

    const feedbackMap = {};
    feedbacks.forEach((fb) => {
      feedbackMap[fb.sessionId?.toString()] = fb;
    });

    // ✅ user registration doc
    const userReg = registeredClass?.registrations.find(
      (r) => r.userId.toString() === userId.toString()
    );

    // ✅ build processed sessions
    const processedSessions = (cls.sessions || []).map((session) => {
      const sessionDate = moment(session.date).tz(TZ).format("YYYY-MM-DD");
      const start = moment.tz(`${sessionDate} ${session.startTime}`, "YYYY-MM-DD HH:mm", TZ);
      const end = moment.tz(`${sessionDate} ${session.endTime}`, "YYYY-MM-DD HH:mm", TZ);

      let sessionStatus = "Upcoming";
      if (now.isBetween(start, end)) sessionStatus = "Live";
      else if (now.isAfter(end)) sessionStatus = "Ended";

      const feedback = feedbackMap[session._id?.toString()] || null;

      // ✅ fix attendance lookup
      let attendance = "Absent";
      if (userReg && Array.isArray(userReg.sessionAttendance)) {
        const att = userReg.sessionAttendance.find(
          (a) => a.sessionId?.toString() === session._id?.toString()
        );
        if (att) attendance = att.status;
      }

      return {
        _id: session._id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: sessionStatus,
        attendance,
        feedback,
        feedbackGiven: !!feedback, // ✅ new flag
      };
    });

    // ✅ class status
    let classStatus = "Ended";
    const todayDateStr = now.format("YYYY-MM-DD");
    const todaySessions = processedSessions.filter(
      (s) => moment(s.date).format("YYYY-MM-DD") === todayDateStr
    );

    if (todaySessions.length > 0) {
      if (todaySessions.some((s) => s.status === "Live")) {
        classStatus = "Live";
      } else if (todaySessions.some((s) => s.status === "Upcoming")) {
        classStatus = "Upcoming";
      } else {
        classStatus = "Ended";
      }
    }

    // ✅ certificate eligibility
    let userAttendedAllSessions = true;
    (cls.sessions || []).forEach((sess) => {
      const att = userReg?.sessionAttendance?.find(
        (a) => a.sessionId?.toString() === sess._id?.toString()
      );
      if (!att || att.status !== "Present") {
        userAttendedAllSessions = false;
      }
    });

    const result = {
      _id: cls._id,
      title: cls.title,
      theme: cls.theme,
      startDate: cls.startDate,
      endDate: cls.endDate,
      sessionType: cls.sessionType,
      location: cls.location,
      Instructor: cls.Instructor,
      Image: cls.Image,
      Type: cls.Type,
      classStatus,
      sessions: processedSessions,
      notes,
      journel,
      isRegistered: true,
      generateCertificate: Boolean(userAttendedAllSessions),
    };

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("getMyClassById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const getPersonKey = (item) => {
  if (item.userId) return `user_${item.userId.toString()}`;
  if (item.prisonerId) return `prisoner_${item.prisonerId.toString()}`;
  return null;
};

export const getClassByIdAdmin = async (req, res) => {
  try {
    const { classId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const classItem = await ClassesAdmin
      .findById(classId)
      .select("title theme startDate endDate startTime endTime location Instructor Image Type status sessions")
      .populate("location", "location")
      .populate("Instructor", "name")
      .lean();

    if (!classItem) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }

    const now = moment().tz(TZ);
    const endDate = moment(classItem.endDate).tz(TZ);

    let classStatus = "Upcoming";

    if (now.isAfter(endDate)) {
      classStatus = "Ended";
    } else {
      for (const sess of classItem.sessions) {
        const day = moment(sess.date).tz(TZ).format("YYYY-MM-DD");
        const start = moment.tz(`${day} ${sess.startTime}`, "YYYY-MM-DD HH:mm", TZ);
        const end = moment.tz(`${day} ${sess.endTime}`, "YYYY-MM-DD HH:mm", TZ);

        if (now.isBetween(start, end)) {
          classStatus = "Live";
          break;
        }
      }
    }

    classItem.mediaCount = await Media.countDocuments({ classId });

    const registerDoc = await RegisterClass.findOne({ class: classId }).lean();

    let processedSessions = [];

    if (Array.isArray(classItem.sessions)) {
      processedSessions = classItem.sessions.map(sess => {
        const day = moment(sess.date).tz(TZ).format("YYYY-MM-DD");
        const start = moment.tz(`${day} ${sess.startTime}`, "YYYY-MM-DD HH:mm", TZ);
        const end = moment.tz(`${day} ${sess.endTime}`, "YYYY-MM-DD HH:mm", TZ);

        let status = "Upcoming";
        if (now.isBetween(start, end)) status = "Live";
        else if (now.isAfter(end)) status = "Ended";

        const registrationCount = registerDoc?.registrations?.length || 0;

        const presentSet = new Set();

        if (status !== "Upcoming" && registerDoc) {

          for (const reg of registerDoc.registrations || []) {
            const selfSession = reg.sessionAttendance?.find(
              sa => sa.sessionId.toString() === sess._id.toString()
            );

            if (selfSession?.status === "Present") {
              presentSet.add(`user_${reg.userId.toString()}`);
            }
          }

          const instructorSession = registerDoc.instructorAttendances?.find(
            ia => ia.sessionId.toString() === sess._id.toString()
          );

          if (instructorSession) {
            for (const att of instructorSession.attendanceList) {
              if (att.status !== "Present") continue;

              if (att.userId) {
                presentSet.add(`user_${att.userId.toString()}`);
              }

              if (att.prisonerId) {
                presentSet.add(`prisoner_${att.prisonerId.toString()}`);
              }
            }
          }
        }

        return {
          ...sess,
          status,
          registrationCount,
          presentCount: status === "Upcoming" ? 0 : presentSet.size
        };
      });
    }

    const totalSessions = processedSessions.length;
    const totalPages = Math.ceil(totalSessions / limit);
    const startIndex = (page - 1) * limit;

    classItem.sessions = processedSessions.slice(startIndex, startIndex + limit);
    classItem.classStatus = classStatus;

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalSessions,
      totalPages,
      data: classItem
    });

  } catch (err) {
    console.error("Error in getClassByIdAdmin:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSessionAttendanceAndRegistration = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sessionId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const registerDoc = await RegisterClass.findOne({ class: classId }).lean();
    if (!registerDoc) {
      return res.json({ success: true, page, limit, total: 0, data: [] });
    }

    const instructorEntry = registerDoc.instructorAttendances?.find(
      ia => ia.sessionId.toString() === sessionId
    );

    const rows = [];
    const seen = new Set();

    for (const reg of registerDoc.registrations || []) {

      let status = "Absent";

      const selfSession = reg.sessionAttendance?.find(
        sa => sa.sessionId.toString() === sessionId
      );

      if (selfSession?.status === "Present") {
        status = "Present";
      }

      if (instructorEntry) {
        const instMatch = instructorEntry.attendanceList.find(
          a => a.userId && a.userId.toString() === reg.userId.toString()
        );

        if (instMatch?.status === "Present") {
          status = "Present";
        } else if (instMatch?.status === "Absent") {
          status = "Absent";
        }
      }

      rows.push({
        type: "user",
        id: reg.userId,
        attendance: status
      });

      seen.add(`user_${reg.userId}`);
    }

    if (instructorEntry) {
      for (const att of instructorEntry.attendanceList) {
        if (!att.prisonerId) continue;

        const key = `prisoner_${att.prisonerId}`;
        if (seen.has(key)) continue;

        rows.push({
          type: "prisoner",
          id: att.prisonerId,
          attendance: att.status
        });

        seen.add(key);
      }
    }

    const userIds = rows.filter(r => r.type === "user").map(r => r.id);
    const prisonerIds = rows.filter(r => r.type === "prisoner").map(r => r.id);

    const users = await mongoose.model("User")
      .find({ _id: { $in: userIds } })
      .select("name email")
      .lean();

    const prisoners = await Prisoner.find({ _id: { $in: prisonerIds } })
      .select("prisonerId prisonerName")
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const prisonerMap = new Map(prisoners.map(p => [p._id.toString(), p]));

    const finalRows = rows.map(r => {
      if (r.type === "user") {
        const u = userMap.get(r.id.toString());
        return {
          type: "user",
          id: r.id,
          name: u?.name || "Deleted User",
          email: u?.email || "",
          attendance: r.attendance
        };
      }

      const p = prisonerMap.get(r.id.toString());
      return {
        type: "prisoner",
        id: r.id,
        name: p?.prisonerName || "Prisoner Deleted",
        prisonerCode: p?.prisonerId || "Deleted",
        attendance: r.attendance
      };
    });

    const total = finalRows.length;
    const start = (page - 1) * limit;

    return res.json({
      success: true,
      page,
      limit,
      total,
      data: finalRows.slice(start, start + limit)
    });

  } catch (err) {
    console.error("getSessionAttendanceAndRegistration error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getAllUpcomingClasses = async (req, res) => {
  try {
    const TZ = "Asia/Kolkata";
    const now = moment().tz(TZ);

    const allClasses = await ClassesAdmin.find({
      status: "Active",
    })
      .populate("location", "location")
      .populate("Instructor", "name")
      .sort({ startDate: 1 })
      .lean();

    const upcomingClasses = allClasses.filter(cls => {
      if (!Array.isArray(cls.sessions)) return false;
      return cls.sessions.some(session => {
        const sessionDate = moment(session.date).tz(TZ).format("YYYY-MM-DD");
        const startDateTime = moment.tz(`${sessionDate} ${session.startTime}`, "YYYY-MM-DD HH:mm", TZ);
        return startDateTime.isAfter(now);
      });
    });

    return res.status(200).json({
      success: true,
      message: "Upcoming classes fetched successfully.",
      data: upcomingClasses
    });
  } catch (error) {
    console.error("Error fetching upcoming classes:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming classes.",
      error: error.message
    });
  }
};



export default { addClass, editClass, blockClass, deleteClass, getClassById, getAllClasses, getActiveClasses, getUpcomingClasses, getClassesByDate, getRecommendedClasses, resetUserInterests, getMyEvents, getClassByIdAdmin, getSessionAttendanceAndRegistration, getAllUpcomingClasses, getMyClassById,fixClassSessionAttendanceIds };
