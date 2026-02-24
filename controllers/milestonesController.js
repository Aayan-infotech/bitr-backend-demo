import { generateUserReportPDF } from '../utils/pdfReportGenerator.js';
import mongoose from 'mongoose';
import mentorshipActivity from '../models/mentorshipActivityModel.js';
import User from '../models/User.js';
import RegisterClass from '../models/registerClassModel.js';
import PDFDocument from 'pdfkit';
import ClassesAdmin from '../models/classesAdminModel.js';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

function generateCertificateId(userId, classId) {
  const combined = userId + classId;
  let sum = 0;

  for (let i = 0; i < combined.length; i++) {
    sum += combined.charCodeAt(i);
  }

  const idStr = String(sum * 1234567).slice(0, 10).padEnd(10, '0');
  return idStr;
}

export const getUserMilestonesReport = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const registerClasses = await RegisterClass.find({
      "registrations.userId": userId
    }).lean();

    let totalSessions = 0;
    let attendedSessions = 0;

    for (const regClass of registerClasses) {
      const userRegistration = regClass.registrations.find(r => r.userId.toString() === userId);
      if (userRegistration) {
        totalSessions += userRegistration.sessionAttendance.length;
        attendedSessions += userRegistration.sessionAttendance.filter(s => s.status === 'Present').length;
      }
    }

    const totalAssignedActivities = await mentorshipActivity.countDocuments({
      assignedUsers: userId
    });

    const attendedActivities = await mentorshipActivity.countDocuments({
      "AttendedUsersAndNotes.userId": userId
    });

    const sessionProgress = totalSessions ? ((attendedSessions / totalSessions) * 100).toFixed(2) : '0.00';
    const activityProgress = totalAssignedActivities ? ((attendedActivities / totalAssignedActivities) * 100).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        attendance: {
          totalSessions,
          attendedSessions,
          totalAssignedActivities,
          attendedActivities
        },
        progress: {
          sessionProgress: `${sessionProgress}%`,
          activityProgress: `${activityProgress}%`
        }
      }
    });

  } catch (error) {
    next(error);
  }
};


export const downloadUserReport = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const registerClasses = await RegisterClass.find({
      "registrations.userId": userId
    }).lean();

    let totalSessions = 0;
    let attendedSessions = 0;

    for (const regClass of registerClasses) {
      const userRegistration = regClass.registrations.find(r => r.userId.toString() === userId);
      if (userRegistration) {
        totalSessions += userRegistration.sessionAttendance.length;
        attendedSessions += userRegistration.sessionAttendance.filter(s => s.status === 'Present').length;
      }
    }

    const totalAssignedActivities = await mentorshipActivity.countDocuments({
      assignedUsers: userId
    });

    const attendedActivities = await mentorshipActivity.countDocuments({
      "AttendedUsersAndNotes.userId": userId
    });

    const sessionProgress = totalSessions ? ((attendedSessions / totalSessions) * 100).toFixed(2) : '0.00';
    const activityProgress = totalAssignedActivities ? ((attendedActivities / totalAssignedActivities) * 100).toFixed(2) : '0.00';

    const reportData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      attendance: {
        totalSessions,
        attendedSessions,
        totalAssignedActivities,
        attendedActivities
      },
      progress: {
        sessionProgress: `${sessionProgress}%`,
        activityProgress: `${activityProgress}%`
      }
    };

    const pdfBuffer = await generateUserReportPDF(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=UserReport_${userId}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    next(error);
  }
};



export const generateAppreciationCertificate = async (req, res, next) => {
  try {
    const { classId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid classId or userId.' });
    }

    const classInfo = await ClassesAdmin.findById(classId).lean();
    const user = await User.findById(userId).lean();
    const registerDoc = await RegisterClass.findOne({ class: classId }).lean();

    if (!classInfo || !user || !registerDoc) {
      return res.status(404).json({ success: false, message: 'Class, user, or registration not found.' });
    }

    const userRegistration = registerDoc.registrations.find(r => r.userId.toString() === userId);

    if (!userRegistration) {
      return res.status(400).json({ success: false, message: 'User not registered for this class.' });
    }

    const totalSessions = classInfo.sessions.length;
    const attendedSessions = userRegistration.sessionAttendance.filter(s => s.status === 'Present').length;

    if (totalSessions !== attendedSessions) {
      return res.status(400).json({ success: false, message: 'User did not attend all sessions.' });
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Certificate_${userId}_${classId}.pdf`);
      res.send(pdfData);
    });

    // Background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#572649');

    // Border lines
    doc.lineWidth(5);
    doc.strokeColor('#f59e0b');
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

    // Title
    doc.fontSize(36)
      .fillColor('#00FFFF')
      .font('Times-Bold')
      .text('CERTIFICATE', { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(20)
      .fillColor('#00FFFF')
      .text('OF APPRECIATION', { align: 'center' });

    doc.moveDown(2);

    doc.fontSize(18)
      .fillColor('#FFFFFF')
      .font('Times-Roman')
      .text('This certificate is proudly presented to', { align: 'center' });

    doc.moveDown(1);

    doc.fontSize(32)
      .fillColor('#87CEFA')
      .font('Times-BoldItalic')
      .text(user.name, { align: 'center' });

    doc.moveDown(1.5);

    doc.fontSize(18)
      .fillColor('#FFFFFF')
      .font('Times-Roman')
      .text(`For successfully participating in the Class`, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(20)
      .fillColor('#FFD700')
      .text(`"${classInfo.title}"`, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(16)
      .fillColor('#FFFFFF')
      .text(`Organized by All Back In The Ring in ${new Date().getFullYear()}`, { align: 'center' });

    doc.moveDown(1);

    const formattedStartDate = new Date(classInfo.startDate).toLocaleDateString();
    const formattedEndDate = new Date(classInfo.endDate).toLocaleDateString();

    doc.fontSize(14)
      .fillColor('#D1D5DB')
      .text(`Class Duration: ${formattedStartDate} - ${formattedEndDate}`, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(14)
      .fillColor('#D1D5DB')
      .text(`Date of Issue: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.moveDown(3);

    // Generate consistent certificate ID
    const certificateId = generateCertificateId(userId, classId);

    doc.fillColor('#E5E7EB')
      .fontSize(10)
      .text(`Certificate ID: ${certificateId} | Issued on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    doc.end();

  } catch (error) {
    next(error);
  }
};


export const mentorshipActivityOverview = async (req, res, next) => {
  try {
    const { activityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return res.status(400).json({ success: false, message: 'Invalid activityId.' });
    }

    const activity = await mentorshipActivity.findById(activityId)
      .populate('assignedUsers', 'name email')
      .populate('AttendedUsersAndNotes.userId', 'name email')
      .populate('mentorId', 'name email')
      .lean();

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    const assignedUsersCount = Array.isArray(activity.assignedUsers) ? activity.assignedUsers.length : 0;
    const attendedUsersCount = Array.isArray(activity.AttendedUsersAndNotes) ? activity.AttendedUsersAndNotes.length : 0;

    const assignedUsers = (activity.assignedUsers || []).map(user => ({
      id: user._id,
      name: user.name,
      email: user.email
    }));

    const attendedUsers = (activity.AttendedUsersAndNotes || []).map(entry => ({
      id: entry.userId?._id || null,
      name: entry.userId?.name || 'Unknown',
      email: entry.userId?.email || 'Unknown',
      notes: entry.notes
    }));

    return res.status(200).json({
      success: true,
      data: {
        id: activity._id,
        title: activity.title,
        date: activity.Date,
        mentorId: activity.mentorId,
        startTime: activity.startTime,
        endTime: activity.endTime,
        activityType: activity.activityType,
        notes: activity.Notes,
        assignedUsersCount,
        attendedUsersCount,
        assignedUsers,
        attendedUsers,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getUserMilestonesCount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Calculate attended sessions
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
          s => s.status === 'Present'
        ).length;
      }
    }

    // Calculate attended activities
    const attendedActivities = await mentorshipActivity.countDocuments({
      "AttendedUsersAndNotes.userId": userId
    });

    const totalAttended = attendedSessions + attendedActivities;

    // 🎯 Simple badge logic: 1 badge for every 10 attended
    const badges = Math.floor(totalAttended / 10);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        attendedSessions,
        attendedActivities,
        totalAttended,
        badges
      }
    });

  } catch (error) {
    next(error);
  }
};


export const checkCertificateEligibilityAndSendEmail = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });


    const registerClasses = await RegisterClass.find({}).lean();

    for (const registerDoc of registerClasses) {
      const classId = registerDoc.class.toString();
      const classInfo = await ClassesAdmin.findById(classId).lean();
      if (!classInfo) continue;

      for (let i = 0; i < registerDoc.registrations.length; i++) {
        const registration = registerDoc.registrations[i];
        const userId = registration.userId.toString();

        // Skip if certificate email already sent
        if (registration.certificateEmailSent) continue;

        const totalSessions = classInfo.sessions.map(s => s._id.toString());
        const attendedSessionIds = registration.sessionAttendance
          .filter(s => s.status === 'Present')
          .map(s => s.sessionId.toString());

        const allSessionsAttended = totalSessions.every(sessionId =>
          attendedSessionIds.includes(sessionId)
        );

        if (allSessionsAttended) {
          const user = await User.findById(userId).lean();
          if (!user) continue;

          const formattedStartDate = new Date(classInfo.startDate).toLocaleDateString();
          const formattedEndDate = new Date(classInfo.endDate).toLocaleDateString();

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
                <h2>Hello ${user.name},</h2>
                <p>🎉 Congratulations! You are eligible for an Appreciation Certificate for successfully attending all sessions of the class <strong>"${classInfo.title}"</strong>.</p>
                <p>Class Duration: ${formattedStartDate} - ${formattedEndDate}</p>
                <p>Please log in to your dashboard to download your certificate.</p>
                <p>Thank you for your dedication to "All Back In The Ring".</p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
            to: user.email,
            subject: `🎓 Certificate Eligibility Achieved for "${classInfo.title}" 🎓`,
            html: htmlBody
          });

          await RegisterClass.updateOne(
            { _id: registerDoc._id, "registrations.userId": userId },
            { $set: { "registrations.$.certificateEmailSent": true } }
          );

          registerDoc.registrations[i].certificateEmailSent = true;
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Certificate eligibility cron job ran successfully.`);
  } catch (error) {
    console.error('Error in certificate eligibility cron:', error);
  }
};



export default {
  getUserMilestonesReport,
  downloadUserReport,
  checkCertificateEligibilityAndSendEmail,
  generateAppreciationCertificate,
  mentorshipActivityOverview,
  getUserMilestonesCount
};