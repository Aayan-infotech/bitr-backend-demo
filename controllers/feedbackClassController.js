import mongoose from "mongoose";
import moment from "moment-timezone";
import ClassesAdmin from "../models/classesAdminModel.js";
import RegisterClass from "../models/registerClassModel.js";
import Feedback from "../models/classFeedbackModel.js";

const TZ = "Asia/Kolkata";

function findEligibleSession(sessions = [], attendance = []) {
  const now = moment().tz(TZ);
  const presentIds = new Set(
    attendance
      .filter(a => a.status === "Present")
      .map(a => a.sessionId.toString())
  );

  let chosen = null;
  sessions.forEach(sess => {
    const sid = sess._id.toString();
    if (!presentIds.has(sid)) return;

    const day = moment(sess.date).tz(TZ).format("YYYY-MM-DD");
    const endDT = moment.tz(`${day} ${sess.endTime}`, "YYYY-MM-DD hh:mm A", TZ);
    if (endDT.isBefore(now)) {
      if (!chosen || endDT.isAfter(moment(chosen.date).tz(TZ))) {
        chosen = sess;
      }
    }
  });

  return chosen;
}

function findInstructorSession(sessions = []) {
  const now = moment().tz(TZ);
  let chosen = null;

  sessions.forEach(sess => {
    const day = moment(sess.date).tz(TZ).format("YYYY-MM-DD");
    const endDT = moment.tz(`${day} ${sess.endTime}`, "YYYY-MM-DD hh:mm A", TZ);
    if (endDT.isBefore(now)) {
      if (!chosen || endDT.isAfter(moment(chosen.date).tz(TZ))) {
        chosen = sess;
      }
    }
  });

  return chosen;
}

export const giveFeedback = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, instructorId, rating, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    if (!userId && !instructorId) {
      return res.status(400).json({ message: "Either userId or instructorId is required." });
    }

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ message: "Invalid instructorId." });
    }

    if (rating == null || !String(feedback).trim()) {
      return res.status(400).json({ message: "Rating and feedback are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const [classDoc, regDoc] = await Promise.all([
      ClassesAdmin.findById(classId).select("sessions").lean(),
      RegisterClass.findOne({ class: classId }).lean()
    ]);

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found." });
    }

    if (!regDoc) {
      return res.status(403).json({ message: "No registrations for this class." });
    }

    let sessionToUse = null;

    if (userId) {
      const userReg = regDoc.registrations.find(r => r.userId.toString() === userId);
      if (!userReg) {
        return res.status(403).json({ message: "User not registered for this class." });
      }

      sessionToUse = findEligibleSession(classDoc.sessions, userReg.sessionAttendance);
      if (!sessionToUse) {
        return res.status(403).json({ message: "No past, attended session found for user." });
      }
    }

    if (instructorId) {
      sessionToUse = findInstructorSession(classDoc.sessions);
      if (!sessionToUse) {
        return res.status(403).json({ message: "No past session found for instructor to give feedback." });
      }
    }

    const filter = {
      classId,
      sessionId: sessionToUse._id
    };
    if (userId) filter.userId = userId;
    if (instructorId) filter.instructorId = instructorId;

    const exists = await Feedback.findOne(filter);
    if (exists) {
      return res.status(409).json({ message: "Feedback already submitted for this session." });
    }

    const newFb = await Feedback.create({
      userId,
      instructorId,
      classId,
      sessionId: sessionToUse._id,
      rating,
      feedback
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      data: newFb
    });

  } catch (err) {
    console.error("giveFeedback error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAllFeedbacks = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    const classDoc = await ClassesAdmin.findById(classId).select("sessions").lean();
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found." });
    }

    const feedbacks = await Feedback.find({ classId })
      .populate("userId", "name email")
      .populate("instructorId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = feedbacks.map(fb => {
      const sess = classDoc.sessions.find(s => s._id.toString() === fb.sessionId.toString());
      return {
        _id: fb._id,
        user: fb.userId,
        instructor: fb.instructorId,
        classId: fb.classId,
        sessionId: fb.sessionId,
        sessionDate: sess?.date,
        sessionStartTime: sess?.startTime,
        sessionEndTime: sess?.endTime,
        rating: fb.rating,
        feedback: fb.feedback,
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });

  } catch (error) {
    console.error("getAllFeedbacks error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getFeedbackByUser = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, instructorId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid classId." });
    }
    if (!userId && !instructorId) {
      return res.status(400).json({ message: "userId or instructorId is required." });
    }

    const classDoc = await ClassesAdmin.findById(classId).select("sessions").lean();
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found." });
    }

    const query = { classId };
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId." });
      }
      query.userId = userId;
    } else {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({ message: "Invalid instructorId." });
      }
      query.instructorId = instructorId;
    }

    const fb = await Feedback.findOne(query)
      .populate("userId", "name email")
      .populate("instructorId", "name email")
      .lean();

    if (!fb) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    const sess = classDoc.sessions.find(s => s._id.toString() === fb.sessionId.toString());

    return res.status(200).json({
      success: true,
      data: {
        ...fb,
        sessionDate: sess?.date,
        sessionStartTime: sess?.startTime,
        sessionEndTime: sess?.endTime
      }
    });

  } catch (error) {
    console.error("getFeedbackByUser error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const editFeedback = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, instructorId, rating, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid classId." });
    }
    if (!userId && !instructorId) {
      return res.status(400).json({ message: "userId or instructorId is required." });
    }
    if (rating == null || rating < 1 || rating > 5 || !String(feedback).trim()) {
      return res.status(400).json({ message: "Valid rating (1–5) and non-empty feedback are required." });
    }

    const filter = { classId };
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId." });
      }
      filter.userId = userId;
    } else {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({ message: "Invalid instructorId." });
      }
      filter.instructorId = instructorId;
    }

    const updatedFb = await Feedback.findOneAndUpdate(
      filter,
      { rating, feedback },
      { new: true }
    )
      .populate("userId", "name email")
      .populate("instructorId", "name email")
      .lean();

    if (!updatedFb) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    const classDoc = await ClassesAdmin.findById(classId).select("sessions").lean();
    const sess = classDoc.sessions.find(s => s._id.toString() === updatedFb.sessionId.toString());

    return res.status(200).json({
      success: true,
      message: "Feedback updated.",
      data: {
        ...updatedFb,
        sessionDate: sess?.date,
        sessionStartTime: sess?.startTime,
        sessionEndTime: sess?.endTime
      }
    });

  } catch (err) {
    console.error("editFeedback error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const deleteFeedback = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;
    const { userId, instructorId } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sessionId)
    ) {
      return res.status(400).json({ message: "Invalid classId or sessionId." });
    }

    const filter = { classId, sessionId };
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId." });
      }
      filter.userId = userId;
    } else if (instructorId) {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({ message: "Invalid instructorId." });
      }
      filter.instructorId = instructorId;
    } else {
      return res.status(400).json({ message: "userId or instructorId is required." });
    }

    const deleted = await Feedback.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({ message: "Feedback not found for the specified session." });
    }

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully.",
      data: deleted
    });

  } catch (error) {
    console.error("deleteFeedback error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export default {
    giveFeedback,
    getAllFeedbacks,
    getFeedbackByUser,
    editFeedback,
    deleteFeedback
};