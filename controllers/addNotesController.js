import mongoose from "mongoose";
import AddNotes from "../models/addNotesModel.js";
import ClassesAdmin from "../models/classesAdminModel.js";
import { saveBufferLocally } from "../utils/localUploader.js";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif"
]);
const MAX_BYTES = 10 * 1024 * 1024;

async function handleFileUpload(file) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw { status: 400, message: "Only PDF or image files are allowed." };
  }
  if (file.size > MAX_BYTES) {
    throw { status: 400, message: "File too large. Max 10MB." };
  }
  const { relPath } = await saveBufferLocally(file, "notes");
  return relPath;
}

function toAbsoluteUrl(req, relPath) {
  if (/^https?:\/\//i.test(relPath)) {
    return relPath;
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const cleanPath = relPath.replace(/^\/+/, '');
  return `${protocol}://${host}/${cleanPath}`;
}

export const addNotes = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title and description required." });
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid classId." });
    }

    const cls = await ClassesAdmin.findById(classId);
    if (!cls) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found." });
    }

    let uploadFile = "";
    if (req.file) {
      const relPath = await handleFileUpload(req.file);
      uploadFile = toAbsoluteUrl(req, relPath); // ✅ save absolute URL in DB
    }

    const note = await AddNotes.findOneAndUpdate(
      { classId },
      { title, description, uploadFile },
      { new: true, upsert: true, runValidators: true, context: "query" }
    );

    return res.status(200).json({ success: true, data: note });
  } catch (err) {
    const status = err.status || 500;
    return res
      .status(status)
      .json({ success: false, message: err.message || "Server error." });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const note = await AddNotes.findOne({ classId }).populate("classId", "title");

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    return res.status(200).json({ success: true, data: note });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error.", error: error.message });
  }
};


export const deleteNote = async (req, res) => {
  try {
    const {classId, noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid note ID." });
    }

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ success: false, message: "Invalid note ID." });
    }
    const note = await AddNotes.findByIdAndDelete(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }
    return res.status(200).json({ success: true, message: "Note deleted." });
  } catch {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};


export default { addNotes, getNoteById,deleteNote };