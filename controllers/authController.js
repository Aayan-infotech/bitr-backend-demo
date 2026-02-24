import authService from "../services/authService.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { saveBufferLocally } from "../utils/localUploader.js";

dotenv.config();

function toAbsoluteUrl(req, relPath) {
  if (!relPath) return null;

  if (/^https?:\/\//i.test(relPath)) {
    return relPath;
  }
  const protocol =
    req.headers["x-forwarded-proto"] ||
    req.protocol ||
    "http";

  const host = req.headers["host"];
  const cleanPath = relPath.replace(/^\/+/, "");

  return `${protocol}://${host}/${cleanPath}`;
}

const register = async (req, res) => {
  try {
    const { role } = req.params;
    const { name, number, email, password, confirmPassword, dateofbirth, location, ip, expertise, prisonerid } = req.body;

    const files = Array.isArray(req.files) ? req.files : (req.files?.files || []);
    let uploadedUrls = [];

    if (files && files.length > 0) {
      uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const { relPath } = await saveBufferLocally(file, "profiles");
          return toAbsoluteUrl(req, relPath);
        })
      );
    }



    const userData = { name, number, email, password, confirmPassword, dateofbirth, location, ip, prisonerid, expertise };
    const result = await authService.register(userData, role, uploadedUrls);

    return res.status(result.status).json(result.data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};


const deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId." });
    }

    const allowedRoles = ["user", "instructor", "mentor"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role provided." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { email, name } = user;

    await User.updateOne(
      { _id: userId },
      { $set: { isDeleted: true } },
      { upsert: true }
    );

    try {
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
            <h2>Hello ${name || "User"},</h2>
            <p>Your account associated with the email <strong>${email}</strong> has been deleted from <b>All Back In The Ring</b>.</p>
            <p>If you did not request this deletion, please contact our support team immediately.</p>
            <p>We’re sorry to see you go. Thank you for being a part of our community.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: "Your Account Has Been Deleted",
        html: htmlBody,
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message);
    }

    return res.status(200).json({
      success: true,
      message: `Account deleted successfully for ${role}. Confirmation email sent to ${email}.`,
    });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};




const adminRegister = async (req, res) => {
  try {
    const { role } = req.params;
    const { name, number, email, password, confirmPassword, dateofbirth, location, ip, expertise, prisonerid } = req.body;

    const files = Array.isArray(req.files) ? req.files : (req.files?.files || []);
    let uploadedUrls = [];

    if (files && files.length > 0) {
      uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const { relPath } = await saveBufferLocally(file, "users");
          return toAbsoluteUrl(req, relPath);
        })
      );
    }

    const userData = { name, number, email, password, confirmPassword, dateofbirth, location, ip, prisonerid, expertise };
    const result = await authService.adminRegister(userData, role, uploadedUrls);

    if (result?.status === 200 && result?.data?.user) {
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
            <h2>Hello ${name},</h2>
            <p>Your profile has been successfully created by the administrator on "All Back In The Ring".</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role:</strong> ${role}</p>
            <p>Please use your email and the password you provided during registration to log in and complete your profile.</p>
            <p>If you did not expect this, please contact support immediately.</p>
            <p>Thank you for joining us!</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: "Your Profile Has Been Created Successfully",
        html: htmlBody,
      });
    }

    return res.status(result.status).json(result.data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};


const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { location, email, number, name, bio } = req.body;

    const files = Array.isArray(req.files) ? req.files : (req.files?.files || []);
    let uploadedUrls = [];

    if (location === "" || !mongoose.Types.ObjectId.isValid(location)) {
      return res.status(400).json({ success: false, message: "Invalid Location" });
    }

    if (email) {
      return res.status(400).json({ success: false, message: "Email could not be Updated" });
    }

    if (number && !/^\d{1,25}$/.test(number)) {
      return res.status(400).json({
        status: "error",
        message: "Number must contain only digits and be up to 25 characters.",
      });
    }

    if (!name || name.length > 50 || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name)) {
      return res.status(400).json({
        status: "error",
        message: "Name must contain only alphabets and max 50 characters.",
      });
    }

    if (files && files.length > 0) {
      uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const { relPath } = await saveBufferLocally(file, "users");
          return toAbsoluteUrl(req, relPath);
        })
      );
    }

    const userData = req.body;
    const result = await authService.updateUser(userId, userData, uploadedUrls);

    if (result.status === 200) {
      const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});


      const user = await User.findById(userId).lean();
      if (user) {
        const updatedFields = [];
        if (location) updatedFields.push("Location");
        if (number) updatedFields.push("Phone Number");
        if (name) updatedFields.push("Name");
        if (bio) updatedFields.push("Bio");
        if (uploadedUrls.length > 0) updatedFields.push("Profile Picture");

        const updatedFieldsText = updatedFields.length
          ? updatedFields.join(", ")
          : "Profile Information";

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
              <h2>Hello ${user.name},</h2>
              <p>Your account information has been successfully updated.</p>
              <p><strong>Updated Fields:</strong> ${updatedFieldsText}</p>
              <p>Please log in to your profile to review your updated information.</p>
              <p>Thank you for being part of "All Back In The Ring".</p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: "Your Account Information Was Updated Successfully",
          html: htmlBody,
        });
      }
    }

    return res.status(result.status).json(result.data || { success: false });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};


const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userData = { email, otp };
    const result = await authService.verifyOtp(userData);
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgetPassword(email);
  res.status(result.status).json(result.data);
}
const resetPassword = async (req, res) => {
  const { hash, password, confirmPassword } = req.body;
  const userData = { hash, password, confirmPassword };
  const result = await authService.resetPassword(userData);
  res.status(result.status).json(result.data);
};

const saveBiometric = async (req, res) => {
  const { key, biometricD } = req.body;
  const userData = { key, biometricD };
  const result = await authService.saveBiometric(userData);
  res.status(result.status).json(result.data);
}

const verifyBiometric = async (req, res) => {
  const { role } = req.params;
  const { key, biometricData } = req.body;
  const userData = { key, biometricData, role };
  const result = await authService.verifyBiometric(userData);
  res.status(result.status).json(result.data);
};

const login = async (req, res) => {
  const { role } = req.params;
  const { email, password, fcmToken } = req.body;
  const result = await authService.login({ email, password, role, fcmToken });
  res.status(result.status).json(result.data);
};


const verifyPasswordOtp = async (req, res) => {
  const { email, otp } = req.body;
  const userData = { email, otp };
  const result = await authService.verifyPasswordOtp(userData);
  res.status(result.status).json(result.data);
}



const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const userData = { refreshToken };
  const result = await authService.refreshToken(userData);
  res.status(result.status).json(result.data);
}



const logout = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.refreshToken = null;
    user.fcmToken = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Logout successful.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};



export default {
  register,
  login,
  verifyBiometric,
  verifyPasswordOtp,
  verifyOtp,
  forgetPassword,
  resetPassword,
  saveBiometric,
  adminRegister,
  refreshToken,
  updateUser,
  logout,
  deleteAccount
};