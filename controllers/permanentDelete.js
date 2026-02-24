import { randomUUID } from "crypto";

import User from "../models/User.js";
import SupportTicket from "../models/SupportTicket.js";
import SupportMessage from "../models/SupportMessage.js";
import ClassesAdmin from "../models/classesAdminModel.js";
import RegisterClass from "../models/registerClassModel.js";
import Incident from "../models/reportIncidentModel.js";
import MentorshipActivity from "../models/mentorshipActivityModel.js";
import Notification from "../models/notificationModel.js";
import AssignUser from "../models/assignUserByInstructor.js";
import AssignInstructor from "../models/assignInstructorByMentor.js";
import AddNotes from "../models/addNotesModel.js";
import AddMediaAdmin from "../models/addMediaAdminModel.js";
import Feedback from "../models/classFeedbackModel.js";
import Journel from "../models/addJournelModel.js";
import Questionaires from "../models/addQuestionaireModel.js";
import UserDeletionLog from "../models/userDeletionLog.js";
import RollbackSnapshot from "../models/deleteRollbackSnapshot.js";
import sendDeletionEmail from "../utils/userDeletionEmail.js";

const modelMap = {
  User,
  SupportTicket,
  SupportMessage,
  Journel,
  Feedback,
  Notification,
  MentorshipActivity,
  AssignUser,
  AssignInstructor,
  ClassesAdmin,
  RegisterClass,
  Incident,
  AddNotes,
  AddMediaAdmin,
  Questionaires,
};

const snapshot = async (
  operationId,
  collection,
  Model,
  filter,
  affectedCollections,
  restoreType 
) => {
  const docs = await Model.find(filter).lean();
  if (!docs.length) return;

  await RollbackSnapshot.create({
    operationId,
    collection,
    documents: docs,
    restoreType,
  });

  affectedCollections.push({
    collection,
    action: restoreType === "insert" ? "delete" : "update",
    filter,
    affectedCount: docs.length,
  });
};

const rollback = async (operationId) => {
  const snapshots = await RollbackSnapshot.find({ operationId });

  for (const snap of snapshots) {
    const Model = modelMap[snap.collection];
    if (!Model) continue;

    if (snap.restoreType === "insert") {
      await Model.insertMany(snap.documents, { ordered: false });
    }

    if (snap.restoreType === "replace") {
      for (const doc of snap.documents) {
        await Model.replaceOne(
          { _id: doc._id },
          doc,
          { upsert: true }
        );
      }
    }
  }
};

export const deleteUserByAdmin = async (req, res) => {
  const operationId = randomUUID();
  const affectedCollections = [];

  try {
    const { userId } = req.params;
    const { role, reason } = req.body;

    if (!userId || !role || !reason) {
      throw new Error("userId, role and reason are required");
    }

    const ipAddress = req.ip;

    const user = await User.findById(userId).lean();
    if (!user) throw new Error("User not found");

    const affectedUserName = user.name || "N/A";
    const affectedUserEmail = user.email || "";
    const affectedUserRole = role;


    await snapshot(operationId, "User", User, { _id: userId }, affectedCollections, "insert");
    await snapshot(operationId, "SupportTicket", SupportTicket, { userId }, affectedCollections, "insert");
    await snapshot(operationId, "SupportMessage", SupportMessage, { senderId: userId }, affectedCollections, "insert");
    await snapshot(operationId, "Journel", Journel, { userId }, affectedCollections, "insert");
    await snapshot(operationId, "Feedback", Feedback, { userId }, affectedCollections, "insert");

    await snapshot(
      operationId,
      "RegisterClass",
      RegisterClass,
      {
        $or: [
          { "registrations.userId": userId },
          { "instructorAttendances.attendanceList.userId": userId },
        ],
      },
      affectedCollections,
      "replace"
    );

    await snapshot(
      operationId,
      "Notification",
      Notification,
      {
        $or: [
          { receiverId: userId },
          { users: userId },
          { readBy: userId },
          { deletedBy: userId },
        ],
      },
      affectedCollections,
      "replace"
    );

    await snapshot(
      operationId,
      "MentorshipActivity",
      MentorshipActivity,
      {
        $or: [
          { assignedUsers: userId },
          { "AttendedUsersAndNotes.userId": userId },
        ],
      },
      affectedCollections,
      "replace"
    );

    await snapshot(operationId, "AssignUser", AssignUser, { userIds: userId }, affectedCollections, "replace");
    await snapshot(
      operationId,
      "AssignInstructor",
      AssignInstructor,
      { "instructors.userIds": userId },
      affectedCollections,
      "replace"
    );


    await SupportTicket.deleteMany({ userId });
    await SupportMessage.deleteMany({ senderId: userId });
    await Journel.deleteMany({ userId });
    await Feedback.deleteMany({ userId });

    await RegisterClass.updateMany(
      {},
      {
        $pull: {
          registrations: { userId },
          "instructorAttendances.$[].attendanceList": { userId },
        },
      }
    );

    await Notification.deleteMany({ receiverId: userId });
    await Notification.updateMany(
      {},
      { $pull: { users: userId, readBy: userId, deletedBy: userId } }
    );

    await MentorshipActivity.updateMany(
      {},
      {
        $pull: {
          assignedUsers: userId,
          AttendedUsersAndNotes: { userId },
        },
      }
    );

    await AssignUser.updateMany({}, { $pull: { userIds: userId } });
    await AssignInstructor.updateMany(
      {},
      { $pull: { "instructors.$[].userIds": userId } }
    );

    await Questionaires.updateMany({}, { $pull: { responses: { userId } } });
    await User.deleteOne({ _id: userId });


    await UserDeletionLog.create({
      deletedUserId: userId,
      affectedUserName,
      affectedUserEmail,
      affectedUserRole,
      deletedBy: "admin",
      reason,
      ipAddress,
      affectedCollections,
    });

    await RollbackSnapshot.deleteMany({ operationId });

    if (user.email) {
      await sendDeletionEmail(user.email, user.name, reason);
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully (rollback-safe)",
    });

  } catch (error) {
    await rollback(operationId);

    return res.status(500).json({
      success: false,
      message: "Deletion failed. Rollback completed.",
      error: error.message,
    });
  }
};

export const getDeletedUsersLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim();

    const skip = (page - 1) * limit;

    let filter = {};

    if (search) {
      filter.$or = [
        { affectedUserName: { $regex: search, $options: "i" } },
        { affectedUserEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      UserDeletionLog.find(filter)
        .sort({ deletedAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .lean(),

      UserDeletionLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch deletion logs",
      error: error.message,
    });
  }
};


export default { deleteUserByAdmin ,getDeletedUsersLogs};
