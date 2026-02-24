import mongoose from "mongoose";
import Prisoner from "../models/addPrisonerModel.js";
import Class from "../models/classesAdminModel.js";
import moment from 'moment-timezone';
import User from '../models/User.js';
import Notes from '../models/addNotesModel.js';
import Media from '../models/addMediaAdminModel.js'
import Feedback from '../models/classFeedbackModel.js'
import Incident from '../models/reportIncidentModel.js'
import Attendence from '../models/registerClassModel.js'
import Location from '../models/locationModel.js'

const TZ = "Asia/Kolkata";


export const instructorDashboardStats = async (req, res, next) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructorId"
      });
    }

    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [prisonerCount, prisoners, classCount, upcomingClasses, instructorUser] = await Promise.all([
      Prisoner.countDocuments({ instructorId }),
      Prisoner.find({ instructorId })
        .select('-__v'),
      Class.countDocuments({ Instructor: instructorObjectId }),
      Class.countDocuments({
        Instructor: instructorObjectId,
        "sessions.date": { $gte: startOfToday }
      }),
      User.findOne({ _id: instructorObjectId })
        .select("user_status location")
        .populate("location", "location")
        .lean()
    ]);

    const now = moment().tz(TZ);
    const formattedDate = now.format("ddd, D MMM YYYY");

    res.status(200).json({
      success: true,
      message: "Instructor dashboard stats",
      data: {
        totalPrisoners: prisonerCount,
        totalClasses: classCount,
        upcomingClasses,
        date: formattedDate,
        user_status: instructorUser?.user_status ?? null,
        location: instructorUser?.location ?? null,
        prisoners
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard stats"
    });
  }
};

export const getAllClassesForInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing instructor ID" });
    }

    const classes = await Class.find({ Instructor: instructorId })
      .populate("location")
      .populate("Instructor")
      .lean();

    if (!classes || classes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No classes found for this instructor",
      });
    }

    const classIds = classes.map(c => c._id);

    const [feedbacks, incidents, notes, media] = await Promise.all([
      Feedback.find({ classId: { $in: classIds } })
        .populate("userId", "name")
        .lean(),

      Incident.find({ class: { $in: classIds } }).lean(),
      Notes.find({ classId: { $in: classIds } }).lean(),
      Media.find({ classId: { $in: classIds } }).lean(),
    ]);

    // Group helpers
    const fbByClass = new Map();
    const incByClass = new Map();
    const notesByClass = new Map();
    const mediaByClass = new Map();

    for (const f of feedbacks) {
      const k = String(f.classId);
      if (!fbByClass.has(k)) fbByClass.set(k, []);
      fbByClass.get(k).push(f);
    }

    for (const i of incidents) {
      const k = String(i.class);
      if (!incByClass.has(k)) incByClass.set(k, []);
      incByClass.get(k).push(i);
    }

    for (const n of notes) {
      const k = String(n.classId);
      if (!notesByClass.has(k)) notesByClass.set(k, []);
      notesByClass.get(k).push(n);
    }

    for (const m of media) {
      const k = String(m.classId);
      if (!mediaByClass.has(k)) mediaByClass.set(k, []);
      mediaByClass.get(k).push(m);
    }

    const results = [];
    const now = moment().tz(TZ);

    for (const cls of classes) {
      let classStatus = "Upcoming";

      const classFb = fbByClass.get(String(cls._id)) || [];
      const classInc = incByClass.get(String(cls._id)) || [];
      const classNotes = notesByClass.get(String(cls._id)) || [];
      const classMedia = mediaByClass.get(String(cls._id)) || [];

      // ✅ Sessions with feedback, incidents AND session status
      const sessionsWithDetails = (cls.sessions || []).map((sess) => {
        const sessIdStr = String(sess._id);

        const sessionFeedbacks = classFb.filter(
          (fb) => fb.sessionId && String(fb.sessionId) === sessIdStr
        );

        const sessionIncidents = classInc.filter(
          (inc) => inc.sessionId && String(inc.sessionId) === sessIdStr
        );

        // --- Session Status Logic ---
        const sessionDate = moment(sess.date).tz(TZ).startOf("day");
        const today = moment().tz(TZ).startOf("day");

        let sessionStatus = "Upcoming";
        if (sessionDate.isBefore(today)) sessionStatus = "Ended";
        else if (sessionDate.isSame(today)) sessionStatus = "Live";

        return {
          ...sess,
          status: sessionStatus,   // ✅ Added here
          feedbacks: sessionFeedbacks,
          incidents: sessionIncidents,
        };
      });

      // --- Class Status Logic remains same ---
      const sessionDates = cls.sessions?.map((s) => moment(s.date)) || [];
      if (sessionDates.length > 0) {
        const minDate = moment.min(sessionDates);
        const maxDate = moment.max(sessionDates);

        if (now.isBefore(minDate)) {
          classStatus = "Upcoming";
        } else if (now.isAfter(maxDate)) {
          classStatus = "Ended";
        } else {
          classStatus = "Live";
        }
      }

      results.push({
        ...cls,
        classStatus,
        notes: classNotes,
        media: classMedia,
        sessions: sessionsWithDetails, // ✅ Same key, enriched content
      });
    }

    return res.status(200).json({
      success: true,
      message: "All classes fetched for instructor",
      data: results,
    });

  } catch (err) {
    console.error("getAllClassesForInstructor error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



export const upcomingClassesWithSessions = async (req, res, next) => {
  try {
    const { instructorId } = req.params;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: "instructorId is required in params"
      });
    }


    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    const nowIST = moment().tz(TZ);
    const todayMidnightIST = nowIST.clone().startOf("day");

    const classes = await Class.find({
      Instructor: instructorObjectId,
      "sessions.date": { $gte: todayMidnightIST.toDate() }
    })
      .populate("Instructor", "name")
      .populate("location", "location")
      .lean();

    const result = [];

    for (const cls of classes) {
      const futureSessions = (cls.sessions || []).filter(session => {
        const sessDate = session.date ? moment(session.date).tz(TZ) : null;
        return sessDate && sessDate.isSameOrAfter(todayMidnightIST, "day");
      });

      futureSessions.sort((a, b) => {
        const aDt = moment(a.date).tz(TZ);
        const bDt = moment(b.date).tz(TZ);
        const aStart = (a.startTime || "00:00").split(":").map(Number);
        const bStart = (b.startTime || "00:00").split(":").map(Number);
        aDt.set({ hour: aStart[0], minute: aStart[1] || 0 });
        bDt.set({ hour: bStart[0], minute: bStart[1] || 0 });
        return aDt - bDt;
      });

      let selectedSession = null;
      let classStatus = "Upcoming";

      for (const session of futureSessions) {
        const sessionDate = moment(session.date).tz(TZ);
        const [startHour = 0, startMin = 0] = (session.startTime || "00:00").split(":").map(Number);
        const [endHour = 23, endMin = 59] = (session.endTime || "23:59").split(":").map(Number);

        const sessionStartDt = sessionDate.clone().set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
        const sessionEndDt = sessionDate.clone().set({ hour: endHour, minute: endMin, second: 59, millisecond: 999 });

        if (nowIST.isBetween(sessionStartDt, sessionEndDt, null, "[]")) {
          selectedSession = {
            ...session,
            status: "Live"
          };
          classStatus = "Live";
          break;
        }
        if (nowIST.isBefore(sessionStartDt)) {
          selectedSession = {
            ...session,
            status: "Upcoming"
          };
          classStatus = "Upcoming";
          break;
        }
      }

      if (selectedSession) {
        const { sessionStatus, ...cleanSession } = selectedSession;

        // 🔹 Fetch related notes
        const notes = await Notes.find({ classId: cls._id, status: "active" }).lean();

        result.push({
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
          session: cleanSession,
          notes // 👈 attach here
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Upcoming or live classes",
      classes: result
    });
  } catch (error) {
    console.error("Error fetching upcoming classes:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching class data",
      error: error.message
    });
  }
};


export const getInstructorClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const classItem = await Class
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
    let sessionId = null;
    let latestPastSession = null;
    let hasFutureSession = false;
    let isLive = false;

    for (const sess of classItem.sessions) {
      const sessionDay = moment(sess.date).tz(TZ).format('YYYY-MM-DD');
      const sessionStart = moment.tz(`${sessionDay} ${sess.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
      const sessionEnd = moment.tz(`${sessionDay} ${sess.endTime}`, 'YYYY-MM-DD HH:mm', TZ);

      if (now.isBetween(sessionStart, sessionEnd)) {
        isLive = true;
        sessionId = sess._id;
        break;
      }

      if (sessionEnd.isBefore(now)) {
        if (!latestPastSession || sessionEnd.isAfter(latestPastSession.end)) {
          latestPastSession = {
            id: sess._id,
            end: sessionEnd
          };
        }
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

    if (!sessionId && latestPastSession) {
      sessionId = latestPastSession.id;
    }

    classItem.mediaCount = await Media.countDocuments({ classId });

    classItem.registrationStatus = false;
    classItem.attendanceMarked = false;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const registerDoc = await RegisterClass.findOne({ class: classId }).lean();

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

    classItem.classStatus = classStatus;
    classItem.sessionId = sessionId;

    return res.status(200).json({ success: true, data: classItem });

  } catch (err) {
    console.error("Error fetching class by ID:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getInstructorsByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid locationId"
      });
    }

    const instructors = await User.find({
      role: 'instructor',
      location: new mongoose.Types.ObjectId(locationId),
      user_status: 1   
    })
      .select("name email location user_status")
      .populate("location", "location")
      .lean();

    res.status(200).json({
      success: true,
      message: "Instructors fetched by location",
      data: instructors
    });
  } catch (error) {
    console.error("Error fetching instructors by location:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching instructors"
    });
  }
};



export const getClassSessionsWithNotesAndMedia = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classId"
      });
    }

    const classObjectId = new mongoose.Types.ObjectId(classId);

    const classData = await Class.findById(classObjectId)
      .select("title theme startDate endDate sessionType sessions Image location Instructor Type status")
      .populate("location", "location")
      .populate("Instructor", "name")
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const nowIST = moment().tz(TZ);

    const sessionsWithComputedStatus = (classData.sessions || []).map(sess => {
      const sessionDate = moment(sess.date).tz(TZ);
      const [startHour = 0, startMin = 0] = (sess.startTime || "00:00").split(":").map(Number);
      const [endHour = 23, endMin = 59] = (sess.endTime || "23:59").split(":").map(Number);

      const startDT = sessionDate.clone().set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
      const endDT = sessionDate.clone().set({ hour: endHour, minute: endMin, second: 59, millisecond: 999 });

      let computedStatus = "Upcoming";
      if (nowIST.isBetween(startDT, endDT, null, "[)")) computedStatus = "Live";
      else if (nowIST.isAfter(endDT)) computedStatus = "Ended";

      const { sessionStatus, ...rest } = sess;
      return { ...rest, status: computedStatus };
    });

    const [notes, media] = await Promise.all([
      Notes.find({ classId: classObjectId }).lean(),
      Media.find({ classId: classObjectId }).lean()
    ]);

    res.status(200).json({
      success: true,
      message: "Class sessions, notes, and media fetched successfully",
      data: {
        class: {
          _id: classData._id,
          title: classData.title,
          theme: classData.theme,
          startDate: classData.startDate,
          endDate: classData.endDate,
          sessionType: classData.sessionType,
          Image: classData.Image,
          location: classData.location,
          Instructor: classData.Instructor,
          Type: classData.Type,
          status: classData.status
        },
        sessions: sessionsWithComputedStatus,
        notes,
        media
      }
    });

  } catch (error) {
    console.error("Error fetching class sessions/notes/media:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching class details"
    });
  }
};


export const getSessionDetails = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classId or sessionId"
      });
    }

    const classDoc = await Class.findById(classId)
      .select("title theme startDate endDate sessions Instructor location Type Image")
      .populate("Instructor", "name")
      .populate("location", "location")
      .lean();

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const rawSession = classDoc.sessions.find(sess => sess._id.toString() === sessionId);
    if (!rawSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found in class"
      });
    }

    const TZ = "Asia/Kolkata";
    const nowIST = moment().tz(TZ);
    const sessionDate = moment(rawSession.date).tz(TZ);
    const [startHour = 0, startMin = 0] = String(rawSession.startTime || "00:00").split(":").map(Number);
    const [endHour = 23, endMin = 59] = String(rawSession.endTime || "23:59").split(":").map(Number);

    const startDT = sessionDate.clone().set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
    const endDT = sessionDate.clone().set({ hour: endHour, minute: endMin, second: 59, millisecond: 999 });

    let computedStatus = "Upcoming";
    if (nowIST.isBetween(startDT, endDT, null, "[)")) {
      computedStatus = "Live";
    } else if (nowIST.isAfter(endDT)) {
      computedStatus = "Ended";
    }

    const { sessionStatus, ...restSession } = rawSession;
    const session = { ...restSession, status: computedStatus };

    const attendanceData = await Attendence.findOne({ class: classId }).lean();
    const instructorAttendance = attendanceData?.instructorAttendances?.find(
      att => att.sessionId.toString() === sessionId
    );

    const feedbacks = await Feedback.find({
      classId,
      sessionId
    })
      .populate("userId", "name")
      .populate("instructorId", "name")
      .lean();

    const incidents = await Incident.find({
      class: classId,
      sessionId
    })
      .populate("instructor", "name")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        sessionDetails: {
          session,
          classMeta: {
            _id: classDoc._id,
            title: classDoc.title,
            theme: classDoc.theme,
            startDate: classDoc.startDate,
            endDate: classDoc.endDate,
            location: classDoc.location,
            Instructor: classDoc.Instructor,
            Type: classDoc.Type,
            Image: classDoc.Image,
          }
        },
        attendance: instructorAttendance ?? null,
        feedbacks,
        incidents
      }
    });

  } catch (err) {
    console.error("Error in getSessionDetails:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching session details"
    });
  }
};

export const getTrendingInstructors = async (req, res) => {
  try {
    const instructorClassInfo = await Class.aggregate([
      {
        $group: {
          _id: "$Instructor",
          numClasses: { $sum: 1 },
          classIds: { $push: "$_id" },
          totalSessions: { $sum: { $size: "$sessions" } }
        }
      }
    ]);

    const totalInstructors = instructorClassInfo.length;
    const totalClassesSum = instructorClassInfo.reduce((acc, curr) => acc + curr.numClasses, 0);
    const avgNumClasses = totalInstructors ? totalClassesSum / totalInstructors : 0;

    const aboveIds = instructorClassInfo
      .filter(inst => inst.numClasses >= avgNumClasses)
      .map(x => x._id);

    const belowIds = instructorClassInfo
      .filter(inst => inst.numClasses < avgNumClasses)
      .map(x => x._id);

    const pipeline = instructorIds => [
      { $match: { Instructor: { $in: instructorIds } } },
      {
        $group: {
          _id: "$Instructor",
          numClasses: { $sum: 1 },
          classIds: { $push: "$_id" },
          totalSessions: { $sum: { $size: "$sessions" } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructor"
        }
      },
      { $unwind: "$instructor" },
      {
        $lookup: {
          from: "locations",
          localField: "instructor.location",
          foreignField: "_id",
          as: "location"
        }
      },
      {
        $unwind: {
          path: "$location",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "registerclasses",
          let: { classIds: "$classIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$class", "$$classIds"] } } },
            { $project: { regCount: { $size: "$registrations" } } }
          ],
          as: "regs"
        }
      },
      {
        $addFields: {
          registrations: { $sum: "$regs.regCount" }
        }
      },
      {
        $addFields: {
          registrationPercent: {
            $cond: [
              { $ne: ["$numClasses", 0] },
              { $multiply: [{ $divide: ["$registrations", "$numClasses"] }, 1] },
              0
            ]
          }
        }
      },
      {
        $project: {
          instructorId: "$_id",
          name: "$instructor.name",
          email: "$instructor.email",
          profilePicture: "$instructor.profilePicture", // ✅ Correct source
          location: "$location.location",
          numClasses: 1,
          totalSessions: 1,
          registrations: 1,
          registrationPercent: 1
        }
      },
      { $sort: { registrationPercent: -1 } }
    ];

    let trending = [];
    if (aboveIds.length) {
      trending = await Class.aggregate([...pipeline(aboveIds), { $limit: 4 }]);
    }

    if (trending.length < 20 && belowIds.length) {
      const fillCount = 20 - trending.length;
      const belowTrending = await Class.aggregate([...pipeline(belowIds), { $limit: fillCount }]);
      trending = trending.concat(belowTrending);
    }

    res.status(200).json({
      success: true,
      message: "Trending instructors fetched",
      threshold: avgNumClasses,
      data: trending
    });
  } catch (error) {
    console.error("Error fetching trending instructors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trending instructors"
    });
  }
};






export default {
  instructorDashboardStats,
  upcomingClassesWithSessions,
  getInstructorClassById,
  getInstructorsByLocation,
  getAllClassesForInstructor,
  getClassSessionsWithNotesAndMedia,
  getSessionDetails,
  getTrendingInstructors
};