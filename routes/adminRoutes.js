import { Router } from 'express';
import xss from 'xss';
import { generateWebAccessToken } from '../utils/generateToken.js';
import { authApiLimiter, strictApiLimiter } from '../middlewares/apiRateLimitter.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import ClassesAdmin from '../models/classesAdminModel.js';
import Location from '../models/locationModel.js';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

router.post('/auth/login', authApiLimiter, async (req, res) => {
  const { username, password } = req.body;
  const safeusername = xss(username || "").trim();
  const safepassword = xss(password || "").trim();
  if (safeusername === "ADMKY001" && safepassword === "$Tyj876rd") {
    const webAccessToken = generateWebAccessToken(safeusername);
    return res.status(200).json({ message: 'Admin authenticated successfully', webAccessToken });
  }
  return res.status(401).json({ message: 'Invalid admin credentials' });
});

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'AUTH Error: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    if (decoded.id !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ message: 'AUTH Error: Invalid admin' });
    }
    req.adminUser = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'AUTH Error: Invalid or expired token' });
  }
}

router.get('/getRegister/:role', strictApiLimiter, async (req, res) => {
  const { role } = req.params;
  const allowedRoles = ['user', 'instructor', 'mentor'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role parameter' });
  }

  const {
    page = 1,
    limit = 10,
    search = '',
    filterLocation, // ✅ keep existing
    location,       // ✅ support frontend
    status
  } = req.query;

  try {
    const query = { role };

    // 🔍 Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // 📍 LOCATION FILTER (BACKWARD COMPATIBLE)
    if (filterLocation && mongoose.Types.ObjectId.isValid(filterLocation)) {
      // existing working behaviour
      query.location = filterLocation;
    } 
    else if (location) {
      // frontend sends location name
      const locationDoc = await Location.findOne({
        location: { $regex: `^${location}$`, $options: 'i' }
      }).select('_id');

      if (locationDoc) {
        query.location = locationDoc._id;
      } else {
        query.location = null; // force empty result
      }
    }

    // 🔒 Status filter
    if (status) {
      if (status == 1 || status === 'active') query.user_status = 1;
      else if (status == 2 || status === 'blocked') query.user_status = 2;
      else if (status == 0 || status === 'not verified') query.user_status = 0;
    }

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .populate('location', 'location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    const mappedUsers = users.map(user => ({
      ...user,
      verificationStatus: user.isVerified ? 'verified' : 'not verified',
      accountStatus:
        user.user_status === 2
          ? 'blocked'
          : user.user_status === 1
            ? 'active'
            : 'not verified'
    }));

    return res.status(200).json({
      users: mappedUsers,
      total: totalUsers,
      page: Number(page),
      limit: Number(limit)
    });

  } catch (err) {
    console.error('getRegister error:', err);
    return res.status(500).json({
      message: 'Error fetching users',
      error: err.message
    });
  }
});


router.get('/getAllUsers', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .populate('location', 'location')
      .lean();

    const mappedUsers = users.map(user => ({
      ...user,
      verificationStatus: user.isVerified ? 'verified' : 'not verified',
      accountStatus: user.user_status === 2
        ? 'blocked'
        : user.user_status === 1
          ? 'active'
          : 'not verified'
    }));

    res.status(200).json({ users: mappedUsers });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});


// routes/admin.js (excerpt)
router.patch('/editUserStatus/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { user_status } = req.body;

  if (![1, 2].includes(user_status)) {
    return res.status(400).json({ message: 'Invalid user_status value. Use 1 for active, 2 for block.' });
  }

  try {
    const update = { $set: { user_status } };

    if (user_status === 2) {
      update.$set.refreshToken = null;
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const statusText = user_status === 1 ? 'Active' : 'Blocked';
    const htmlBody = `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #eef2f7; padding: 30px;">
    <div style="background-color: #ffffff; border-radius: 10px; padding: 25px 30px; max-width: 600px; margin: auto; box-shadow: 0 6px 15px rgba(0,0,0,0.08);">
      
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">All Back In The Ring</h1>
        <p style="color: #64748b; margin-top: 5px; font-size: 14px;">Account Status Update</p>
      </div>
      
      <h2 style="color: #0f172a;">Hello ${user.name},</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Your account status has been updated by the administrator.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        <strong>New Status:</strong> 
        <span style="color: ${user_status === 1 ? '#16a34a' : '#dc2626'};">${statusText}</span>
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        ${user_status === 1 
          ? 'You can now enjoy all features as your account is active and ready to use.' 
          : 'Your account has been blocked. Please contact our support team for assistance.'
        }
      </p>

      <div style="text-align: center; margin: 25px 0;">
        ${user_status === 1
          ? `<a href="#" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; display: inline-block;">Go to Dashboard</a>`
          : `<a href="#" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; display: inline-block;">Contact Support</a>`
        }
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
      <p style="color: #64748b; font-size: 14px; text-align: center;">
        Thank you for being part of <strong>All Back In The Ring</strong>.
      </p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} All Back In The Ring. All rights reserved.
      </p>

    </div>
  </div>
`;


    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: user.email,
      subject: `📢 Your Account Status Has Been Updated to "${statusText}"`,
      html: htmlBody
    });

    res.status(200).json({
      message: `User status updated to ${statusText.toLowerCase()}.`,
      user
    });

  } catch (err) {
    res.status(500).json({ message: 'Error updating user status', error: err.message });
  }
});


router.put('/changeUserPassword/:userId', async (req, res) => {
  const { userId } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and Confirm Password must be the same.' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!newPassword || !/^\S{6,}$/.test(newPassword)) {
  return res.status(400).json({
    status: "error",
    message: "Password must be at least 6 characters long and contain no spaces."
  });
}



    user.password = newPassword;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const htmlBody = `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #eef2f7; padding: 30px;">
    <div style="background-color: #ffffff; border-radius: 10px; padding: 25px 30px; max-width: 600px; margin: auto; box-shadow: 0 6px 15px rgba(0,0,0,0.08);">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">All Back In The Ring</h1>
        <p style="color: #64748b; margin-top: 5px; font-size: 14px;">Security Notification</p>
      </div>
      <h2 style="color: #0f172a;">Hello ${user.name},</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Your account password has been <strong style="color: #16a34a;">successfully updated</strong>.
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        If you did not perform this action, please <a href="#" style="color: #dc2626; text-decoration: none; font-weight: 600;">reset your password immediately</a> 
        and contact our support team for assistance.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
      <p style="color: #64748b; font-size: 14px; text-align: center;">
        Thank you for being part of <strong>All Back In The Ring</strong>.
      </p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} All Back In The Ring. All rights reserved.
      </p>
    </div>
  </div>
`;


    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: user.email,
      subject: '✅ Your Password Has Been Updated Successfully',
      html: htmlBody
    });

    res.status(200).json({ message: 'User password updated successfully.' });

  } catch (err) {
    res.status(500).json({
      message: 'Error updating user password',
      error: err.message,
    });
  }
});

router.get('/stats/overview',adminAuth, async (req, res) => {
  try {
    const activeUsersCount = await User.countDocuments({
      role: 'user',
      user_status: 1
    });

    const activeMentorsCount = await User.countDocuments({
      role: 'mentor',
      user_status: 1
    });

    const activeInstructorsCount = await User.countDocuments({
      role: 'instructor',
      user_status: 1
    });
    const activeClassesCount = await ClassesAdmin.countDocuments({
      status: 'Active'
    });

    return res.status(200).json({
      success: true,
      data: {
        activeUsers: activeUsersCount,
        activeMentors: activeMentorsCount,
        activeInstructors: activeInstructorsCount,
        activeClasses: activeClassesCount
      }
    });
  } catch (err) {
    console.error('Error fetching stats overview:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.get('/getUserById/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId)
      .populate('location', 'location')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const mappedUser = {
      ...user,
      verificationStatus: user.isVerified ? 'verified' : 'not verified',
      accountStatus: user.user_status === 2
        ? 'blocked'
        : user.user_status === 1
          ? 'active'
          : 'not verified'
    };

    res.status(200).json({ user: mappedUser });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});



export default router;
