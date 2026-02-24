import mongoose from 'mongoose';
import mentorshipActivity from '../models/mentorshipActivityModel.js';
import User from '../models/User.js';
import Notification from "../models/notificationModel.js";
import admin from "../config/firebaseConfig.js";
import RegisterClass from '../models/registerClassModel.js';
import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

export const createActivity = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { title, Date, startTime, endTime, activityType, Notes } = req.body;

    if (!title || !mentorId || !Date || !startTime || !endTime || !activityType || !Notes) {
      return res.status(400).json({
        success: false,
        message: 'title, mentorId, date, startTime, endTime, activityType, and notes are required'
      });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found or invalid'
      });
    }

    const newActivity = new mentorshipActivity({
      title,
      mentorId,
      Date,
      startTime,
      endTime,
      activityType,
      Notes
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      message: 'Mentorship activity created successfully',
      data: newActivity
    });
  } catch (error) {
    console.error("Error creating mentorship activity:", error);
    next(error);
  }
};

export const assignUsersToActivity = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const { assignedUserIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return res.status(400).json({ success: false, message: "Invalid activityId." });
    }

    if (!Array.isArray(assignedUserIds) || assignedUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "assignedUserIds is required as a non-empty array." });
    }

    const activity = await mentorshipActivity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity not found." });
    }

    // Assign new users, avoiding duplicates
    activity.assignedUsers = [...new Set([...(activity.assignedUsers || []), ...assignedUserIds])];
    await activity.save();

    const users = await User.find({ _id: { $in: assignedUserIds } });

    let pushSentTo = 0;
    let fcmErrorCount = 0;

    for (const user of users) {
      const notificationDoc = new Notification({
        notificationType: "Upcoming Event Invitation",
        actvityId: activityId,
        template: "template1",
        title: "New Mentorship Activity Assigned",
        message: `You have been assigned to the mentorship activity: '${activity.title}' scheduled on ${activity.Date}.`,
        html: `<p>You have been assigned to the mentorship activity: <strong>${activity.title}</strong> scheduled on ${activity.Date}.</p>`,
        Date: new Date(),
        Time: new Date().toLocaleTimeString(),
        users: [user._id],
      });

      await notificationDoc.save();

      if (user.fcmToken && user.notificationStatus === true) {
        const pushMessage = {
          token: user.fcmToken,
          notification: {
            title: "New Mentorship Activity Assigned",
            body: `Activity: ${activity.title} on ${activity.Date}`,
          },
          data: {
            type: "activity_assignment",
            activityId: String(activity._id),
          },
        };

        try {
          await admin.messaging().send(pushMessage);
          pushSentTo += 1;
        } catch (err) {
          console.error(`FCM error for ${user._id}:`, err);
          fcmErrorCount += 1;

          // Remove invalid FCM token
          if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
            console.log(`Removing invalid FCM token for user ${user._id}`);
            user.fcmToken = null;
            await user.save();
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Users assigned and notifications processed successfully.",
      pushSentTo,
      fcmErrorCount,
      assignedUsers: activity.assignedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllActivities = async (req, res, next) => {
  try {
    const activities = await mentorshipActivity.find().populate('mentorId', 'name email');
    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

export const getActivitiesForUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const activities = await mentorshipActivity.find({
      assignedUsers: userId
    }).populate('mentorId', 'name email');

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};


export const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await mentorshipActivity.findById(id).populate('mentorId', 'name email');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await mentorshipActivity.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await mentorshipActivity.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByMentor = async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    if (!mentorId) {
      return res.status(400).json({
        success: false,
        message: 'mentorId is required'
      });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found or invalid'
      });
    }

    const activities = await mentorshipActivity.find({ mentorId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendanceAndAddNotes = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const { userId, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(activityId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid activityId or userId." });
    }

    if (!notes) {
      return res.status(400).json({ success: false, message: "Notes are required." });
    }

    const activity = await mentorshipActivity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity not found." });
    }

    if (!activity.assignedUsers.some(id => id.toString() === userId)) {
      return res.status(400).json({ success: false, message: "User is not assigned to this activity." });
    }

    const activityDateParts = activity.Date.split('-');
    const endTimeParts = activity.endTime.split(':');

    const activityEndDateTime = new Date(
      parseInt(activityDateParts[0]),
      parseInt(activityDateParts[1]) - 1,
      parseInt(activityDateParts[2]),
      parseInt(endTimeParts[0]),
      parseInt(endTimeParts[1])
    );

    const now = new Date();
    if (now > activityEndDateTime) {
      return res.status(400).json({
        success: false,
        message: "Attendance can only be marked after the activity has ended."
      });
    }

    // --- Save attendance and notes ---
    const existingRecordIndex = activity.AttendedUsersAndNotes.findIndex(
      record => record.userId.toString() === userId
    );

    if (existingRecordIndex !== -1) {
      activity.AttendedUsersAndNotes[existingRecordIndex].notes = notes;
    } else {
      activity.AttendedUsersAndNotes.push({ userId, notes });
    }

    await activity.save();

    // --- Milestone (Badge) Check and Email Triggering Logic ---
    const user = await User.findById(userId);

    const registerClasses = await RegisterClass.find({
      "registrations.userId": userId
    }).lean();

    let attendedSessions = 0;
    for (const regClass of registerClasses) {
      const userRegistration = regClass.registrations.find(r => r.userId.toString() === userId);
      if (userRegistration) {
        attendedSessions += userRegistration.sessionAttendance.filter(s => s.status === 'Present').length;
      }
    }

    const attendedActivities = await mentorshipActivity.countDocuments({
      "AttendedUsersAndNotes.userId": userId
    });

    const totalAttended = attendedSessions + attendedActivities;

    // 🎯 Badge logic: 1 badge for every 10 attended
    const badges = Math.floor(totalAttended / 10);

    // Only trigger email when new badge is achieved
    if (user.lastBadgeAchieved !== badges) {
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
            <p>🎉 Congratulations! You have unlocked a new <strong>Badge #${badges}</strong>.</p>
            <p>This means you have successfully attended <strong>${totalAttended}</strong> combined sessions and activities.</p>
            <p>Keep up the great work and continue your journey towards more achievements!</p>
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
      message: "Attendance and notes recorded successfully.",
      data: activity.AttendedUsersAndNotes
    });

  } catch (error) {
    next(error);
  }
};



export default {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivitiesByMentor,
  assignUsersToActivity,
  getActivitiesForUser,
  markAttendanceAndAddNotes
};
