import moment from "moment-timezone";
import mongoose from "mongoose";
import ClassesAdmin from "../models/classesAdminModel.js";
import RegisterClass from "../models/registerClassModel.js";
import AssignUser from "../models/assignUserByInstructor.js";
import Prisoner from "../models/addPrisonerModel.js";
import User from "../models/User.js";


const TZ = "Asia/Kolkata";

const fixSessionAttendanceLogic = async (classId) => {
  const classDoc = await ClassesAdmin.findById(classId).lean();
  if (!classDoc || !Array.isArray(classDoc.sessions)) {
    throw new Error("Class or sessions not found");
  }

  const registerDoc = await RegisterClass.findOne({ class: classId });
  if (!registerDoc) {
    throw new Error("RegisterClass not found");
  }

  const sessionByDate = new Map();

  for (const s of classDoc.sessions) {
    const day = moment(s.date).format("YYYY-MM-DD");
    sessionByDate.set(day, s._id.toString());
  }

  let instructorFixed = 0;
  let registrationFixed = 0;

  for (const ia of registerDoc.instructorAttendances || []) {
    const createdDay = moment(ia.createdAt).format("YYYY-MM-DD");
    const correctSessionId = sessionByDate.get(createdDay);

    if (
      correctSessionId &&
      ia.sessionId.toString() !== correctSessionId
    ) {
      ia.sessionId = correctSessionId;
      instructorFixed++;
    }
  }

  for (const reg of registerDoc.registrations || []) {
    for (const sa of reg.sessionAttendance || []) {
      const createdDay = moment(sa.createdAt || registerDoc.createdAt)
        .format("YYYY-MM-DD");

      const correctSessionId = sessionByDate.get(createdDay);

      if (
        correctSessionId &&
        sa.sessionId.toString() !== correctSessionId
      ) {
        sa.sessionId = correctSessionId;
        registrationFixed++;
      }
    }
  }

  await registerDoc.save();

  return {
    instructorAttendancesFixed: instructorFixed,
    registrationAttendancesFixed: registrationFixed
  };
};



export const markAttendanceForPrisoners = async (req, res) => {
  try {
    const { classId } = req.params;
    const { attendanceList, instructorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attendanceList must be a non-empty array"
      });
    }

    const classDetails = await ClassesAdmin.findById(classId).lean();
    if (!classDetails) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const now = moment().tz(TZ);
    const activeSession = classDetails.sessions.find(sess => {
      const start = moment.tz(
        `${moment(sess.date).format("YYYY-MM-DD")} ${sess.startTime}`,
        "YYYY-MM-DD HH:mm",
        TZ
      );
      const end = moment.tz(
        `${moment(sess.date).format("YYYY-MM-DD")} ${sess.endTime}`,
        "YYYY-MM-DD HH:mm",
        TZ
      );
      return now.isBetween(start, end);
    });

    if (!activeSession) {
      return res.status(400).json({
        success: false,
        message: "No active session at this time"
      });
    }

    const assigned = await AssignUser.findOne({ instructorId }).lean();
    const assignedUserIds = assigned ? assigned.userIds.map(id => id.toString()) : [];

    let registerDoc = await RegisterClass.findOne({ class: classId });
    if (!registerDoc) {
      registerDoc = new RegisterClass({
        class: classId,
        registrations: [],
        instructorAttendances: []
      });
    }

    let instructorEntry = registerDoc.instructorAttendances.find(
      e =>
        e.instructorId.toString() === instructorId &&
        e.sessionId.toString() === activeSession._id.toString()
    );

    if (!instructorEntry) {
      instructorEntry = {
        instructorId,
        sessionId: activeSession._id,
        attendanceList: []
      };
      registerDoc.instructorAttendances.push(instructorEntry);
    }

    let updatedCount = 0;
    let alreadyMarkedCount = 0;

    for (const { id, status } of attendanceList) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;
      if (!["Present", "Absent"].includes(status)) continue;

      const idStr = id.toString();

      if (assignedUserIds.includes(idStr)) {
        const existing = instructorEntry.attendanceList.find(
          a => a.userId?.toString() === idStr
        );

        if (existing) {
          if (existing.status !== status) {
            existing.status = status;
            updatedCount++;
          } else {
            alreadyMarkedCount++;
          }
        } else {
          instructorEntry.attendanceList.push({ userId: id, status });
          updatedCount++;
        }
        continue;
      }

      const prisoner = await Prisoner.findById(id).lean();
      if (!prisoner || prisoner.status !== "Active") continue;

      const existing = instructorEntry.attendanceList.find(
        a => a.prisonerId?.toString() === idStr
      );

      if (existing) {
        if (existing.status !== status) {
          existing.status = status;
          updatedCount++;
        } else {
          alreadyMarkedCount++;
        }
      } else {
        instructorEntry.attendanceList.push({ prisonerId: id, status });
        updatedCount++;
      }
    }

    if (updatedCount === 0 && alreadyMarkedCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked. You can only edit it."
      });
    }

    await registerDoc.save();

    try {
      await fixSessionAttendanceLogic(classId);
    } catch (fixErr) {
      console.error("Auto fix error:", fixErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Attendance marked/updated for ${updatedCount} entries.`,
      sessionId: activeSession._id
    });

  } catch (err) {
    console.error("markAttendanceForPrisoners error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while marking attendance"
    });
  }
};



export const updateAttendanceForPrisonersBySessionId = async (req, res) => {
  try {
    const { classId } = req.params;
    const { sessionId, instructorId, attendanceList } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sessionId) ||
      !mongoose.Types.ObjectId.isValid(instructorId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid ID(s)" });
    }

    if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attendanceList must be non-empty"
      });
    }

    const classDetails = await ClassesAdmin.findById(classId).lean();
    if (!classDetails) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const sessionExists = classDetails.sessions.some(
      s => s._id.toString() === sessionId
    );

    if (!sessionExists) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const assigned = await AssignUser.findOne({ instructorId }).lean();
    const assignedUserIds = assigned ? assigned.userIds.map(id => id.toString()) : [];

    let registerDoc = await RegisterClass.findOne({ class: classId });
    if (!registerDoc) {
      registerDoc = new RegisterClass({
        class: classId,
        registrations: [],
        instructorAttendances: []
      });
    }

    registerDoc.instructorAttendances =
      registerDoc.instructorAttendances.filter(
        e =>
          !(
            e.instructorId.toString() === instructorId &&
            e.sessionId.toString() === sessionId
          )
      );

    const cleanedAttendanceList = [];

    for (const { id, status } of attendanceList) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;
      if (!["Present", "Absent"].includes(status)) continue;

      const idStr = id.toString();

      if (assignedUserIds.includes(idStr)) {
        cleanedAttendanceList.push({ userId: id, status });
        continue;
      }

      const prisoner = await Prisoner.findById(id).lean();
      if (!prisoner || prisoner.status !== "Active") continue;

      cleanedAttendanceList.push({ prisonerId: id, status });
    }

    registerDoc.instructorAttendances.push({
      instructorId,
      sessionId,
      attendanceList: cleanedAttendanceList
    });

    await registerDoc.save();


    return res.status(200).json({
      success: true,
      message: `Attendance updated for ${cleanedAttendanceList.length} entries.`,
      sessionId
    });

  } catch (err) {
    console.error("updateAttendanceForPrisonersBySessionId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating attendance"
    });
  }
};

export const getSessionByDate = async (req, res) => {
  try {
    const { classId, date } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const classDoc = await ClassesAdmin.findById(classId).lean();
    if (!classDoc) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const matchedSession = classDoc.sessions.find(sess =>
      moment(sess.date).tz(TZ).format("YYYY-MM-DD") === date
    );

    if (!matchedSession) {
      return res.status(404).json({ success: false, message: "No session on this date" });
    }

    return res.status(200).json({
      success: true,
      data: matchedSession
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getSessionAttendanceById = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId) || 
        !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: "Invalid classId or sessionId" });
    }

    const classDoc = await ClassesAdmin.findById(classId).lean();
    if (!classDoc) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const sessionExists = classDoc.sessions.some(
      s => s._id.toString() === sessionId
    );
    if (!sessionExists) {
      return res.status(404).json({ success: false, message: "Session not found in class" });
    }

    const registerDoc = await RegisterClass.findOne({ class: classId }).lean();
    if (!registerDoc) {
      return res.status(404).json({ success: false, message: "No attendance data found for this class" });
    }

    const sessionAttendances = registerDoc.instructorAttendances?.filter(
      a => a.sessionId.toString() === sessionId
    ) || [];

    if (sessionAttendances.length === 0) {
      return res.status(404).json({ success: false, message: "No attendance recorded for this session" });
    }

    return res.status(200).json({
      success: true,
      data: sessionAttendances 
    });

  } catch (err) {
    console.error("getSessionAttendanceById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching session attendance"
    });
  }
};


export default {
  markAttendanceForPrisoners,
  updateAttendanceForPrisonersBySessionId,
  getSessionByDate,
  getSessionAttendanceById
};
