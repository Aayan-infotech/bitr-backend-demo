import mongoose from "mongoose";
import moment from "moment-timezone";
import RegisterClass from "../models/registerClassModel.js";
import ClassesAdmin from "../models/classesAdminModel.js";
import User from "../models/User.js";
import mentorshipActivity from "../models/mentorshipActivityModel.js";
import AssignUser from "../models/assignUserByInstructor.js";
import nodemailer from "nodemailer";
import Prisoner from "../models/addPrisonerModel.js";
import Location from "../models/locationModel.js";
import dotenv from "dotenv";

dotenv.config();

const TZ = "Asia/Kolkata";


export const registerUserToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid classId or userId"
      });
    }

    const [classDetails, user] = await Promise.all([
      ClassesAdmin.findById(classId)
        .select("sessions location tags Instructor instructorId")
        .lean(),
      User.findById(userId)
        .select("location tags")
        .lean()
    ]);

    if (!classDetails || !user) {
      return res.status(404).json({
        success: false,
        message: "Class or User not found"
      });
    }

    if (
      !user.location ||
      !classDetails.location ||
      user.location.toString() !== classDetails.location.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "User location does not match class location"
      });
    }

    /* -------- REGISTER USER -------- */

    const sessionAttendance = classDetails.sessions.map(s => ({
      sessionId: s._id,
      status: "Absent"
    }));

    let regDoc = await RegisterClass.findOne({ class: classId });

    if (!regDoc) {
      regDoc = new RegisterClass({
        class: classId,
        registrations: [{ userId, sessionAttendance }]
      });
    } else {
      const exists = regDoc.registrations.some(
        r => r.userId.toString() === userId.toString()
      );

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "User already registered"
        });
      }

      regDoc.registrations.push({ userId, sessionAttendance });
    }

    await regDoc.save();

    /* -------- ASSIGN TO INSTRUCTOR (🔥 FIXED) -------- */

    const instructorId =
      classDetails.Instructor || classDetails.instructorId;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      throw new Error("Instructor not found or invalid in class document");
    }

    let assignDoc = await AssignUser.findOne({ instructorId });

    if (!assignDoc) {
      assignDoc = new AssignUser({
        instructorId,
        userIds: [userId]
      });
    } else if (
      !assignDoc.userIds.some(id => id.toString() === userId.toString())
    ) {
      assignDoc.userIds.push(userId);
    }

    await assignDoc.save();

    const verify = await AssignUser.findOne({
      instructorId,
      userIds: userId
    });

    if (!verify) {
      throw new Error("Instructor assignment failed to persist");
    }

    return res.status(200).json({
      success: true,
      message: "User registered and assigned successfully"
    });

  } catch (err) {
    console.error("registerUserToClass ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




export const markAttendance = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;
    const { userId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sessionId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const classDetails = await ClassesAdmin.findById(classId).lean();
    if (!classDetails) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const session = (classDetails.sessions || []).find(
      s => s._id.toString() === sessionId
    );
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const registerDoc = await RegisterClass.findOne({ class: classId });
    if (!registerDoc) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const registration = registerDoc.registrations.find(
      r => r.userId?.toString() === userId
    );
    if (!registration) {
      return res.status(404).json({ success: false, message: "User not registered" });
    }

    const attendanceRecord = registration.sessionAttendance.find(
      s => s.sessionId.toString() === sessionId
    );
    if (attendanceRecord && attendanceRecord.status === "Present") {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked as Present for this session."
      });
    }

    const now = moment().tz(TZ);
    const sessionDateStr = moment(session.date).tz(TZ).format("YYYY-MM-DD");
    const sessStart = moment.tz(
      `${sessionDateStr} ${session.startTime}`,
      "YYYY-MM-DD HH:mm",
      TZ
    );
    const sessEnd = moment.tz(
      `${sessionDateStr} ${session.endTime}`,
      "YYYY-MM-DD HH:mm",
      TZ
    );

    if (!now.isBetween(sessStart, sessEnd, null, "[)")) {
      return res.status(400).json({
        success: false,
        message: "Session is not live for attendance marking."
      });
    }

    if (attendanceRecord) {
      attendanceRecord.status = "Present";
    } else {
      registration.sessionAttendance.push({
        sessionId,
        status: "Present",
        markedByInstructor: userId
      });
    }

    await registerDoc.save();

    const user = await User.findById(userId);

    const registerClasses = await RegisterClass.find({
      "registrations.userId": userId
    }).lean();

    let attendedSessions = 0;
    for (const regClass of registerClasses) {
      const userRegistration = regClass.registrations.find(
        r => r.userId.toString() === userId
      );
      if (userRegistration) {
        attendedSessions += userRegistration.sessionAttendance.filter(
          s => s.status === "Present"
        ).length;
      }
    }

    const attendedActivities = await mentorshipActivity.countDocuments({
      "AttendedUsersAndNotes.userId": userId
    });

    const totalAttended = attendedSessions + attendedActivities;
    const badges = Math.floor(totalAttended / 10);

    if (badges > (user.lastBadgeAchieved || 0)) {
      user.lastBadgeAchieved = badges;
      await user.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });


      const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
            <h2>Hello ${user.name},</h2>
            <p>🎉 Congratulations! You’ve unlocked <strong>Badge #${badges}</strong>.</p>
            <p>This means you’ve successfully attended <strong>${totalAttended}</strong> combined sessions and activities.</p>
            <p>Keep pushing forward — more badges await you!</p>
            <p>Thank you for being a valuable part of <strong>All Back In The Ring</strong>.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
        to: user.email,
        subject: `🏅 New Achievement: Badge #${badges} Unlocked!`,
        html: htmlBody
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session attendance marked successfully",
      sessionId
    });

  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const getRegisteredUsersWithAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const registerDoc = await RegisterClass.findOne({ class: classId })
      .populate("registrations.userId", "name email")
      .populate("class", "title sessions")
      .lean();

    if (!registerDoc) {
      return res.status(404).json({ success: false, message: "No registrations found for this class." });
    }

    const classSessions = registerDoc.class.sessions;
    const sessionStats = {};

    classSessions.forEach(session => {
      sessionStats[session._id.toString()] = { present: 0, absent: 0 };
    });

    const userData = registerDoc.registrations.map(r => {
      const perSession = r.sessionAttendance.map(att => {
        const status = att.status;
        const sid = att.sessionId.toString();
        if (status === "Present") sessionStats[sid].present += 1;
        else sessionStats[sid].absent += 1;

        return {
          sessionId: sid,
          status
        };
      });

      return {
        userId: r.userId._id,
        name: r.userId.name,
        email: r.userId.email,
        attendance: perSession
      };
    });

    res.status(200).json({
      success: true,
      data: {
        class: {
          title: registerDoc.class.title,
          sessions: classSessions
        },
        totalUsers: userData.length,
        sessionStats,
        users: userData
      }
    });

  } catch (err) {
    console.error("Error in getRegisteredUsersWithAttendance:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


export const participationOverview = async (req, res) => {
  try {
    const activeClasses = await ClassesAdmin.find({ status: 'Active' }).select('_id').lean();
    const totalClasses = activeClasses.length;

    if (totalClasses === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalClasses: 0,
          registrationPercentage: 0,
          attendancePercentage: 0,
          overall: "100%"
        }
      });
    }

    const allRegistrations = await RegisterClass.find().select('class registrations').lean();
    const activeClassIds = activeClasses.map(c => c._id.toString());
    const activeClassRegs = allRegistrations.filter(reg => activeClassIds.includes(reg.class.toString()));

    const classesWithRegistrations = new Set();
    let totalPresentSessions = 0;
    let totalSessions = 0;

    activeClassRegs.forEach(doc => {
      if (doc.registrations.length > 0) {
        classesWithRegistrations.add(doc.class.toString());

        doc.registrations.forEach(r => {
          if (Array.isArray(r.sessionAttendance)) {
            r.sessionAttendance.forEach(sess => {
              totalSessions++;
              if (sess.status === "Present") totalPresentSessions++;
            });
          }
        });
      }
    });

    const registrationPercentage = ((classesWithRegistrations.size / totalClasses) * 100).toFixed(2);
    const attendancePercentage = totalSessions > 0
      ? ((totalPresentSessions / totalSessions) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalClasses,
        registrationPercentage: `${registrationPercentage}%`,
        attendancePercentage: `${attendancePercentage}%`,
        overall: "100%"
      }
    });

  } catch (err) {
    console.error('Error in participationOverview:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const dashboardCounts = async (req, res) => {
  try {
    const now = moment().tz(TZ);
    const classes = await ClassesAdmin.find({ status: 'Active' })
      .select('_id sessions')
      .lean();

    let firstSessionCount = 0, upcomingCount = 0, liveCount = 0;

    classes.forEach(cls => {
      if (!Array.isArray(cls.sessions) || cls.sessions.length === 0) return;

      cls.sessions.forEach(sess => {
        const start = moment.tz(
          `${moment(sess.date).format('YYYY-MM-DD')} ${sess.startTime}`,
          'YYYY-MM-DD HH:mm', TZ
        );
        const end = moment.tz(
          `${moment(sess.date).format('YYYY-MM-DD')} ${sess.endTime}`,
          'YYYY-MM-DD HH:mm', TZ
        );
        if (now.isBetween(start, end)) liveCount++;
        else if (now.isBefore(start)) upcomingCount++;
      });

      const first = cls.sessions.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )[0];
      const firstStart = moment.tz(
        `${moment(first.date).format('YYYY-MM-DD')} ${first.startTime}`,
        'YYYY-MM-DD HH:mm', TZ
      );
      if (now.isSameOrAfter(firstStart)) firstSessionCount++;
    });

    const [totalPrisoners, totalLocations] = await Promise.all([
      Prisoner.countDocuments({}),
      Location.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: {
        upcomingCount,
        liveCount,
        totalPrisoners,
        totalLocations
      }
    });
  } catch (err) {
    console.error('dashboardCounts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};




export default {
  registerUserToClass,
  markAttendance,
  getRegisteredUsersWithAttendance,
  participationOverview,
  dashboardCounts
};