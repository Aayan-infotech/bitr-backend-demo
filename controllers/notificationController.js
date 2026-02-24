import Notification from "../models/notificationModel.js";
import RegisterClass from "../models/registerClassModel.js";
import ClassesAdmin from "../models/classesAdminModel.js";
import User from "../models/User.js";
import admin from "../config/firebaseConfig.js";
import mongoose from "mongoose";
import { type } from "os";

const REMINDER_INTERVALS = [
  { hours: 24, label: "24 hours" },
];

function parseTimeString(str) {
  if (!str) return { hour: 0, minute: 0 };
  const [hour, minute] = str.split(":").map(Number);
  return { hour, minute };
}

function getSessionDateTimeUTC(session) {
  const date = new Date(session.date);
  const { hour, minute } = parseTimeString(session.startTime); 
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

const getTargetDateRange = (hours) => {
  const now = new Date();
  const start = new Date(now.getTime() + (hours * 60 - 30) * 60 * 1000);
  const end   = new Date(now.getTime() + (hours * 60 + 30) * 60 * 1000);
  return { start, end };
};


export const sendNotification = async (req, res) => {
  try {
    const {
      notificationType,
      template,
      title,
      message,
      html,
      classId,
      users,
      Date,
      Time
    } = req.body;

    if (
      !notificationType ||
      !template ||
      !title ||
      !message ||
      !html ||
      !users ||
      !Array.isArray(users) ||
      users.length === 0
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    if (!["Inspirational Quote", "Upcoming Event Invitation"].includes(notificationType)) {
      return res.status(400).json({ success: false, message: "Invalid notificationType." });
    }
    if (notificationType === "Upcoming Event Invitation" && !classId) {
      return res.status(400).json({ success: false, message: "classId is required for Upcoming Event Invitation." });
    }

    const allUsers = await User.find({ _id: { $in: users } });
    if (allUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found.' });
    }

    const eligiblePushUsers = allUsers.filter(
      user => user.fcmToken && user.notificationStatus === true
    );

    const saveOnlyUsers = allUsers.filter(
      user => !(user.fcmToken && user.notificationStatus === true)
    );

    let pushSentTo = 0;
    let fcmErrorCount = 0;

    for (const user of eligiblePushUsers) {
      try {
        const pushMessage = {
          token: user.fcmToken,
          notification: { title, body: message },
          data: { html, type: notificationType }
        };
        await admin.messaging().send(pushMessage);
        pushSentTo += 1;
      } catch (err) {
        console.error(`FCM send error for token ${user.fcmToken}:`, err);
        fcmErrorCount += 1;
      }
    }

    const notificationDoc = new Notification({
      notificationType,
      template,
      title,
      message,
      html,
      users: allUsers.map(u => u._id),
      ...(classId && { classId }),
      Date,
      Time
    });
    await notificationDoc.save();

    return res.status(201).json({
      success: true,
      message: "Notification processed.",
      pushSentTo,
      userCount: allUsers.length,
      notificationId: notificationDoc._id,
      fcmErrorCount
    });

  } catch (error) {
    console.error("Error in sendNotification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification.",
      error: error.message
    });
  }
};


export const getNotificationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const notifications = await Notification.find({
      users: userId,
      deletedBy: { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .sort({ createdAt: -1 })
      .lean();


    return res.status(200).json({
      success: true,
      message: `Notifications for user ${userId}`,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};


export const sendClassReminders = async (req, res) => {
  try {
    let totalSessions = 0;
    let totalNotifications = 0;
    let errors = [];
    let notificationsCreated = [];

    for (const interval of REMINDER_INTERVALS) {
      const { start, end } = getTargetDateRange(interval.hours);

      const classes = await ClassesAdmin.find({
        status: "Active",
      }).lean();

      for (const classObj of classes) {
        const sessionsToRemind = (classObj.sessions || []).filter(session => {
          if (session.status !== "Active") return false;
          const sessionDateTime = getSessionDateTimeUTC(session);
          return sessionDateTime >= start && sessionDateTime <= end;
        });

        if (sessionsToRemind.length === 0) continue;

        const regClass = await RegisterClass.findOne({ class: classObj._id }).lean();
        const registeredUserIds = regClass
          ? regClass.registrations.map(r => r.userId)
          : [];
        if (!registeredUserIds.length) continue;

        totalSessions += sessionsToRemind.length;

        for (const session of sessionsToRemind) {
          const allRegisteredUsers = await User.find({ _id: { $in: registeredUserIds } }).lean();

          const eligibleNotificationUsers = allRegisteredUsers.filter(
            user => user.notificationStatus === true
          );

          const eligiblePushUsers = eligibleNotificationUsers.filter(
            user => user.fcmToken
          );

          if (eligibleNotificationUsers.length === 0) continue; 

          const title = `${classObj.Type} Reminder`;
          const sessionDateTime = getSessionDateTimeUTC(session);
          const dateStr = sessionDateTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
          const startTime = session.startTime || "at scheduled time";
          const message = `Your ${classObj.Type} '${classObj.title}' is scheduled on ${dateStr} at ${startTime}`;

          let pushSentTo = 0;
          let fcmErrorCount = 0;
          for (const user of eligiblePushUsers) {
            const pushMsg = {
              token: user.fcmToken,
              notification: { title, body: message },
              data: {
                classId: String(classObj._id),
                sessionId: String(session._id),
                type: "class_reminder",
              }
            };
            try {
              await admin.messaging().send(pushMsg);
              pushSentTo++;
            } catch (e) {
              fcmErrorCount++;
              errors.push(`User ${user._id}: ${e.message}`);
            }
          }

          const notificationDoc = new Notification({
            notificationType: "Class Reminder",
            classId: classObj._id,
            template: "template1",
            title,
            message,
            Date: sessionDateTime,
            Time: session.startTime,
            users: eligibleNotificationUsers.map(u => u._id),
          });
          await notificationDoc.save();
          notificationsCreated.push(notificationDoc._id);
          totalNotifications += eligibleNotificationUsers.length;
        }
      }
    }
    return res.status(200).json({
      success: true,
      checkedSessions: totalSessions,
      notificationsCreated: notificationsCreated.length,
      errors,
      totalNotifications
    });
  } catch (error) {
    console.error("Error in sendClassReminders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send class reminders.",
      error: error.message
    });
  }
};


export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(notificationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid notificationId or userId" });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { $addToSet: { readBy: userId } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteNotificationForUser = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(notificationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid notificationId or userId" });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { $addToSet: { deletedBy: userId } },  // add userId to deletedBy if not present
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, message: "Notification deleted for user", data: notification });
  } catch (error) {
    console.error("Error deleting notification for user:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const notificationSettings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.notificationStatus = !user.notificationStatus;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Notifications are now ${user.notificationStatus ? "enabled" : "disabled"}.`,
      notificationStatus: user.notificationStatus,
    });
  } catch (error) {
    console.error("Error toggling notification status:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const sendChatNotification = async (req, res) => {
  try {
    const { notificationType, senderName, receiverId, message } = req.body;

    if (
      !notificationType ||
      notificationType !== 'messageNotification' ||
      !senderName ||
      !receiverId ||
      !message
    ) {
      return res.status(400).json({ success: false, message: 'Missing or invalid required fields.' });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'Invalid receiverId format.' });
    }

    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver user not found.' });
    }

    if (!receiver.fcmToken || receiver.notificationStatus !== true) {
      return res.status(403).json({
        success: false,
        message: 'Receiver does not have a valid FCM token or has disabled notifications. Notification not sent.'
      });
    }

    const title = `Message From ${senderName}`;

    const pushMessage = {
      token: receiver.fcmToken,
      notification: {
        title: title,
        body: message
      },
      data: {
        type: notificationType,
        senderName: senderName
      }
    };

    try {
      await admin.messaging().send(pushMessage);
      return res.status(200).json({ success: true, message: 'Push notification sent to receiver.' });
    } catch (err) {
      console.error(`FCM send error for token ${receiver.fcmToken}:`, err);
      return res.status(500).json({
        success: false,
        message: "Failed to send push notification.",
        error: err.message
      });
    }

  } catch (error) {
    console.error('Error in sendChatNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    });
  }
};

export default {
  sendNotification,
  getNotificationsByUserId,
  sendClassReminders,
  markAsRead,
  deleteNotificationForUser,
  notificationSettings,
  sendChatNotification
};
