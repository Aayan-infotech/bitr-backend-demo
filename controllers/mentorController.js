import mongoose from "mongoose";
import Prisoner from "../models/addPrisonerModel.js";
import ClassesAdmin from "../models/classesAdminModel.js";
import moment from 'moment-timezone';
import User from '../models/User.js';
import Notes from '../models/addNotesModel.js';
import Media from '../models/addMediaAdminModel.js'
import Feedback from '../models/classFeedbackModel.js'
import Incident from '../models/reportIncidentModel.js'
import Attendence from '../models/registerClassModel.js'
import AssignedInstructors from '../models/assignInstructorByMentor.js'



const TZ = "Asia/Kolkata";

export const getInstructorsByMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: "mentorId is required" });
    }

    const assignment = await AssignedInstructors.findOne({ mentorId })
      .populate({
        path: 'instructors.instructorId',
        select: 'name email role profilePicture location',
        populate: {
          path: 'location',
          select: 'location'
        }
      })
      .populate({
        path: 'instructors.userIds',
        select: 'name number email dateofbirth profilePicture location',
        populate: {
          path: 'location',
          select: 'location'
        }
      });

    if (!assignment || assignment.instructors.length === 0) {
      return res.status(404).json({ success: false, message: "No instructors found for this mentor" });
    }

    // Construct the final response manually
    const instructors = await Promise.all(assignment.instructors.map(async inst => {
      const instructor = inst.instructorId;
      // assignedUsers should be an array of user objects, not a single object
      let assignedUsers = [];
      if (Array.isArray(inst.userIds)) {
        assignedUsers = inst.userIds;
      } else if (inst.userIds) {
        assignedUsers = [inst.userIds];
      }

      // Flatten populated assignedUsers if they are arrays of arrays
      assignedUsers = assignedUsers.flat();

      // Fetch prisoners for this instructor
      let prisoners = [];
      let prisonersCount = 0;
      if (instructor?._id) {
        prisoners = await Prisoner.find({ instructorId: instructor._id })
          .select("_id prisonerId prisonerName location status createdAt")
          .populate("location", "_id location")
          .lean();

        prisoners = prisoners.map(p => ({
          _id: p._id,
          prisonerId: p.prisonerId,
          prisonerName: p.prisonerName,
          location: p.location ? { _id: p.location._id, location: p.location.location } : null,
          status: p.status,
          createdAt: p.createdAt,
          joinedDate: p.createdAt ? moment(p.createdAt).tz(TZ).format("YYYY-MM-DD") : null
        }));

        prisonersCount = prisoners.length;
      }

      return {
        _id: instructor?._id,
        name: instructor?.name,
        email: instructor?.email,
        role: instructor?.role,
        profilePicture: instructor?.profilePicture || "",
        location: instructor?.location || null,
        totalClasses: instructor?.totalClasses || 0,
        prisonersCount,
        prisoners,
        assignedUsers: assignedUsers.map(user => ({
          _id: user._id,
          name: user.name,
          number: user.number,
          email: user.email,
          dateofbirth: user.dateofbirth,
          profilePicture: user.profilePicture || "",
          location: user.location || null
        }))
      };
    }));

    res.status(200).json({
      success: true,
      data: instructors
    });

  } catch (error) {
    console.error("Error fetching instructors:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// export const getInstructorsByMentor = async (req, res) => {
//   try {
//     const { mentorId } = req.params;

//     if (!mentorId) {
//       return res.status(400).json({ success: false, message: "mentorId is required" });
//     }

//     const assignment = await AssignedInstructors.findOne({ mentorId })
//       .populate([{
//         path: 'instructors.instructorId',
//         select: 'name email role profilePicture location',
//         populate: {
//           path: 'location',
//           select: 'location'
//         }
//       },
//         {
//           path: 'instructors.userIds',
//           select: 'name number email dateofbirth profilePicture location',
//           populate: {
//             path: 'location',
//             select: 'location'
//           }
//         }
//       ]);

//     if (!assignment || assignment.instructors.length === 0) {
//       return res.status(404).json({ success: false, message: "No instructors found for this mentor" });
//     }

//     const instructors = assignment.instructors.map(item => item.instructorId);

//     res.status(200).json({
//       success: true,
//       data: instructors
//     });
//   } catch (error) {
//     console.error("Error fetching instructors:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };


export const getLiveOrUpcomingClassesForMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: "mentorId is required" });
    }

    const assignment = await AssignedInstructors.findOne({ mentorId });

    if (!assignment || assignment.instructors.length === 0) {
      return res.status(404).json({ success: false, message: "No instructors assigned" });
    }

    const instructorIds = assignment.instructors.map(i => i.instructorId);

    const now = moment().tz(TZ);
    const today = now.clone().startOf('day');

    const classes = await ClassesAdmin.find({
      Instructor: { $in: instructorIds },
      status: 'Active',
      'sessions.date': { $gte: today.toDate() }
    })
      .populate('Instructor', 'name email location')
      .populate('location', 'location');

    const filteredClasses = classes.map(cls => {
      const sortedSessions = cls.sessions
        .filter(session => {
          const sessionDate = moment(session.date).tz(TZ).format("YYYY-MM-DD");
          const currentDate = now.format("YYYY-MM-DD");
          const currentTime = now.format("HH:mm");

          const isLive =
            sessionDate === currentDate &&
            currentTime >= session.startTime &&
            currentTime <= session.endTime;

          const isUpcoming =
            sessionDate > currentDate ||
            (sessionDate === currentDate && currentTime < session.startTime);

          return isLive || isUpcoming;
        })
        .sort((a, b) => {
          const aTime = moment.tz(`${moment(a.date).format('YYYY-MM-DD')} ${a.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
          const bTime = moment.tz(`${moment(b.date).format('YYYY-MM-DD')} ${b.startTime}`, 'YYYY-MM-DD HH:mm', TZ);
          return aTime - bTime;
        });

      const nearestSession = sortedSessions.length > 0 ? (() => {
        const s = sortedSessions[0];
        const sessionDate = moment(s.date).tz(TZ).format("YYYY-MM-DD");
        const currentDate = now.format("YYYY-MM-DD");
        const currentTime = now.format("HH:mm");

        let sessionStatus = 'Upcoming';
        if (
          sessionDate === currentDate &&
          currentTime >= s.startTime &&
          currentTime <= s.endTime
        ) {
          sessionStatus = 'Live';
        }

        return {
          ...s.toObject(),
          sessionStatus
        };
      })() : null;

      if (!nearestSession) return null;

      return {
        _id: cls._id,
        title: cls.title,
        theme: cls.theme,
        sessionType: cls.sessionType,
        Image: cls.Image,
        location: cls.location,
        Instructor: cls.Instructor,
        Type: cls.Type,
        session: nearestSession
      };
    }).filter(cls => cls !== null);

    res.status(200).json({
      success: true,
      data: filteredClasses
    });

  } catch (error) {
    console.error("Error fetching live/upcoming classes:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getInstructorDashboardSummary = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Valid instructorId is required" });
    }

    const ObjectId = mongoose.Types.ObjectId;

    const classCount = await ClassesAdmin.countDocuments({ Instructor: new ObjectId(instructorId) });

    const assignments = await AssignedInstructors.find({
      "instructors.instructorId": new ObjectId(instructorId)
    }).lean();

    const assignedUserIds = assignments.flatMap(assign =>
      assign.instructors
        .filter(i => i.instructorId.toString() === instructorId)
        .flatMap(i => i.userIds)
    );

    const assignedUsers = await User.find({ _id: { $in: assignedUserIds } })
      .select("name email profilePicture role location")
      .populate("location", "location")
      .lean();

    const prisoners = await Prisoner.find({ instructorId: new ObjectId(instructorId) })
      .select("_id")
      .lean();

    const assignedPrisonersCount = prisoners.length;

    return res.status(200).json({
      success: true,
      data: {
        instructorId,
        classCount,
        assignedPrisonersCount,
        assignedUsers: assignedUsers
      }
    });

  } catch (error) {
    console.error("Error in getInstructorDashboardSummary:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getAssignedUsersForInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Valid instructorId is required" });
    }

    const ObjectId = mongoose.Types.ObjectId;

    const assignments = await AssignedInstructors.find({
      "instructors.instructorId": new ObjectId(instructorId)
    }).lean();

    const userIds = assignments.flatMap(assign =>
      assign.instructors
        .filter(i => i.instructorId.toString() === instructorId)
        .flatMap(i => i.userIds)
    );

    const users = await User.find({ _id: { $in: userIds } })
      .select("name email profilePicture role location")
      .populate("location", "location")
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Error in getAssignedUsersForInstructor:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAssignedPrisonersForInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Valid instructorId is required" });
    }

    const prisoners = await Prisoner.find({ instructorId })
      .select("prisonerId prisonerName location status createdAt")
      .populate("location", "location")
      .lean();

    res.status(200).json({
      success: true,
      count: prisoners.length,
      data: prisoners
    });
  } catch (error) {
    console.error("Error in getAssignedPrisonersForInstructor:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export default {
  getInstructorsByMentor,
  getLiveOrUpcomingClassesForMentor,
  getInstructorDashboardSummary,
  getAssignedUsersForInstructor,
  getAssignedPrisonersForInstructor
}