import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { hashBiometric, compareBiometric } from '../utils/biometric.js';
import { generateAccessToken, generateRefreshToken, generateOTP, regenerateOTP } from '../utils/generateToken.js';
import nodemailer from 'nodemailer';
import crypto from "crypto";
import dotenv from 'dotenv';
dotenv.config();

const generateSecretHash = () => {
  return crypto.randomBytes(32).toString("hex");
};


async function assignUniqueSecretHash(user) {
  let unique = false;
  let hash;

  while (!unique) {
    hash = generateSecretHash();
    const existing = await User.findOne({ biometricData: hash });
    if (!existing) unique = true;
  }

  return hash;
}


const register = async (data, role, uploadFile) => {
  try {
    const existingUser = await User.findOne({ email: data.email });

    if (existingUser) {
      if (existingUser.user_status === 1) {
        return { status: 400, data: { message: 'User already exists' } };
      } else if (existingUser.user_status === 2) {
        return { status: 400, data: { message: 'User already exists, but account is blocked' } };
      } else {
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });


        const htmlBody = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center;">
        <div style="font-size: 80px; color: #333;">🔒</div>
        <div style="background: #144fa9db; padding: 30px; border-radius: 4px; color: #fff; font-size: 20px; margin: 20px 0;">
          <div style="font-size: 30px; font-weight: 800; margin: 7px 0;">Back In The Ring</div>
          <div style="font-family: monospace;">Thanks for signing up!</div>
          <div style="margin-top: 25px, font-size: 25px, letter-spacing: 3px;">Please Verify Your Email Address</div>
          <div style="font-size: 35px; margin-top: 15px;">📧</div>
        </div>

        <h2 style="margin: 20px 0 10px;">Hello, ${existingUser.name}</h2>
        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px dashed #007bff; color: #007bff; margin: 20px 0;">
          ${otp}
        </div>

        <p style="margin-top: 10px;">Please use this OTP to complete your verification. The OTP is valid for the next 10 minutes.</p>
        <a href="#" style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #007bff; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">Verify Now</a>
      </div>

      <div style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
        <p>If you did not request this OTP, please <a href="#" style="color: #007bff; text-decoration: none;">contact us</a> immediately.</p>
        <p>Thank you,<br>The All In The Ring Team</p>
      </div>
    </div>
  </div>
  `;

        await transporter.sendMail({
          from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
          to: data.email,
          subject: `Dear ${existingUser.name}, Verify Your Email using the code below.`,
          html: htmlBody,
        });

        return {
          status: 200,
          data: { message: 'Your account is unverified. An OTP has been sent to your email for verification.' },
        };
      }
    }

    const ins_ip = data.ip || data.connection?.remoteAddress;

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let hash;
    while (true) {
      hash = generateSecretHash();
      const existing = await User.findOne({ biometricData: hash });
      if (!existing) break;
    }

    let biohash;
    while (true) {
      biohash = generateSecretHash();
      const existing = await User.findOne({ biometricDataVal: biohash });
      if (!existing) break;
    }

    const user = new User({
      role,
      name: data.name,
      profilePicture: uploadFile.length > 0
        ? typeof uploadFile[0] === "string"
          ? uploadFile[0]
          : uploadFile[0].url || null
        : null,
      number: data.number,
      email: data.email,
      password: data.password,
      location: data.location,
      dateofbirth: data.dateofbirth,
      prisonerid: data.prisonerid,
      expertise: data.expertise,
      biometricData: hash,
      biometricDataVal: biohash,
      otp,
      otpExpiry,
      ins_ip,
    });

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
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center;">
        <div style="font-size: 80px; color: #333;">🔒</div>
        <div style="background: #144fa9db; padding: 30px; border-radius: 4px; color: #fff; font-size: 20px; margin: 20px 0;">
          <div style="font-size: 30px; font-weight: 800; margin: 7px 0;">Back In The Ring</div>
          <div style="font-family: monospace;">Thanks for signing up!</div>
          <div style="margin-top: 25px; font-size: 25px, letter-spacing: 3px;">Please Verify Your Email Address</div>
          <div style="font-size: 35px; margin-top: 15px;">📧</div>
        </div>

        <h2 style="margin: 20px 0 10px;">Hello, ${data.name}</h2>
        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px dashed #007bff; color: #007bff; margin: 20px 0;">
          ${otp}
        </div>

        <p style="margin-top: 10px;">Please use this OTP to complete your verification. <b>The OTP is valid for the next 10 minutes.</b></p>
        <a href="#" style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #007bff; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">Verify Now</a>
      </div>

      <div style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
        <p>If you did not request this OTP, please <a href="#" style="color: #007bff; text-decoration: none;">contact us</a> immediately.</p>
        <p>Thank you,<br>The All In The Ring Team</p>
      </div>
    </div>
  </div>
  `;

    await transporter.sendMail({
      from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
      to: data.email,
      subject: `Dear ${data.name}, Verify Your Email using the code below.`,
      html: htmlBody,
    });

    return { status: 201, data: { message: 'User created, OTP sent' } };
  } catch (err) {
    console.error('Error during signup:', err);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
};


const verifyOtp = async (data) => {
  try {
    const { email, otp } = data;
    const user = await User.findOne({ email });
    if (!user) {
      return { status: 404, data: { message: 'User not found' } };
    }
    if (user.isVerified === true) {
      return { status: 400, data: { message: 'Account already verified.' } };
    }
    if (user.otp !== otp) {
      return { status: 400, data: { message: 'Invalid OTP.' } };
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return { status: 400, data: { message: 'OTP expired.' } };
    }

    user.isVerified = true;
    user.user_status = 1;
    user.otp = null;
    user.otpExpiry = null;
    const biometricHash = await assignUniqueSecretHash(user);
    user.biometricData = biometricHash;
    await user.save();
    return { status: 200, data: { message: 'OTP Verified Successfully', biometricHash } };
  } catch (error) {
    console.error('Error during OTP verification:', error);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
};
const verifyPasswordOtp = async (data) => {
  try {
    const { email, otp } = data;

    const user = await User.findOne({ email });
    if (!user) {
      return { status: 404, data: { message: 'User not found' } };
    }

    if (user.otp !== otp) {
      return { status: 400, data: { message: 'Invalid OTP.' } };
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return { status: 400, data: { message: 'OTP expired.' } };
    }

    user.otp = null;
    user.otpExpiry = null;

    const biometricHash = await assignUniqueSecretHash(user);

    user.biometricData = biometricHash;

    await user.save();

    return {
      status: 200,
      data: {
        message: 'OTP Verified Successfully',
        biometricHash,
      },
    };
  } catch (error) {
    console.error('Error during OTP verification:', error);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
};


const forgetPassword = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return { status: 404, data: { message: 'Invalid User Email' } };
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
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
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center;">
        <div style="font-size: 80px; color: #333;">🔒</div>
        <div style="background: #144fa9db; padding: 30px; border-radius: 4px; color: #fff; font-size: 20px; margin: 20px 0;">
          <div style="font-size: 30px; font-weight: 800; margin: 7px 0;">Back In The Ring</div>
          <div style="font-family: monospace;">Forgot Password ?</div>
          <div style="margin-top: 25px; font-size: 25px, letter-spacing: 3px;">Please Verify Your Email Address</div>
          <div style="font-size: 35px; margin-top: 15px;">📧</div>
        </div>

        <h2 style="margin: 20px 0 10px;">Hello, ${user.name}</h2>
        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px dashed #007bff; color: #007bff; margin: 20px 0;">
          ${otp}
        </div>

        <p style="margin-top: 10px;">Please use this OTP to complete your verification. <b>The OTP is valid for the next 10 minutes.</b></p>
        <a href="#" style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #007bff; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">Verify Now</a>
      </div>

      <div style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
        <p>If you did not request this OTP, please <a href="#" style="color: #007bff; text-decoration: none;">contact us</a> immediately.</p>
        <p>Thank you,<br>The All In The Ring Team</p>
      </div>
    </div>
  </div>
   `;

    await transporter.sendMail({
      from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Dear ${user.name}, Verify Your Email using the code below.`,
      html: htmlBody,
    });

    return { status: 201, data: { message: 'OTP sent to email' } };
  } catch (err) {
    console.error('Error during forgot password:', err);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
};


const resetPassword = async (data) => {
  const { hash, password, confirmPassword } = data;

  const user = await User.findOne({ biometricData: hash });
  if (!user) {
    return { status: 404, data: { message: "User not found" } };
  }

  if (password !== confirmPassword) {
    return { status: 400, data: { message: "Passwords do not match" } };
  }
  user.password = password;

  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  return {
    status: 200,
    data: { message: "Password reset successfully" }
  };
};


const saveBiometric = async (data) => {
  const { key, biometricD } = data;
  const user = await User.findOne({ biometricData: key });
  if (!user) return { status: 404, data: { message: "User not found" } };
  if (user.isVerified === false) return { status: 400, data: { message: "User account not verified" } };
  if (user.isBiometricVerified) return { status: 400, data: { message: "Overwrite denied. Biometric already verified." } };
  user.biometricDataVal = await hashBiometric(biometricD);
  user.isBiometricVerified = true;
  await user.save();
  return { status: 200, data: { message: "Biometric data saved successfully" } };
};

const login = async ({ email, password, role, fcmToken }) => {
  const validRoles = ["user", "instructor", "mentor"];
  if (!validRoles.includes(role)) {
    return { status: 400, data: { message: 'Invalid role.' } };
  }

  const user = await User.findOne({ email, role: role.toLowerCase() });
  if (!user) {
    return { status: 404, data: { message: "User not found" } };
  }

  if (user.isDeleted === true) {
    return { status: 403, data: { message: "Your account has been deleted. Please contact support." } };
  }

  if (!user.isVerified) {
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
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
        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center;">
            <div style="font-size: 80px; color: #333;">🔒</div>
            <div style="background: #144fa9db; padding: 30px; border-radius: 4px; color: #fff; font-size: 20px; margin: 20px 0;">
              <div style="font-size: 30px; font-weight: 800; margin: 7px 0;">Back In The Ring</div>
              <div style="font-family: monospace;">Your Account is not verified yet.</div>
              <div style="margin-top: 25px; font-size: 25px; letter-spacing: 3px;">Please Verify Your Email Address</div>
              <div style="font-size: 35px; margin-top: 15px;">📧</div>
            </div>
            <h2 style="margin: 20px 0 10px;">Hello, ${user.name}</h2>
            <p>Your One-Time Password (OTP) for verification is:</p>
            <div style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px dashed #007bff; color: #007bff; margin: 20px 0;">
              ${otp}
            </div>
            <p style="margin-top: 10px;">Please use this OTP to complete your verification. The OTP is valid for the next 10 minutes.</p>
            <a href="#" style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #007bff; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">Verify Now</a>
          </div>
          <div style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
            <p>If you did not request this OTP, please <a href="#" style="color: #007bff; text-decoration: none;">contact us</a> immediately.</p>
            <p>Thank you,<br>The Back In The Ring Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Dear ${user.name}, Verify Your Email using the code below.`,
      html: htmlBody,
    });

    return {
      status: 403,
      data: { message: 'You have not verified your email. Please verify your email first.' }
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { status: 400, data: { message: 'Invalid password' } };
  }

  if (user.user_status !== 1) {
    return { status: 403, data: { message: 'Your account is inactive. Contact admin.' } };
  }

  user.fcmToken = fcmToken ?? null;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const biometricHash = await assignUniqueSecretHash(user);

  user.biometricData = biometricHash;
  user.refreshToken = refreshToken;

  await user.save();

  const freshUser = await User.findById(user._id);

  console.log(`[LOGIN] Login success for ${email}. Returning tokens.`);

  return {
    status: 200,
    data: {
      message: 'Login successful',
      accessToken,
      refreshToken,
      biometricHash,
      user: {
        id: freshUser._id,
        name: freshUser.name,
        email: freshUser.email,
        role: freshUser.role,
        profilePicture: freshUser.profilePicture,
        isBiometricVerified: freshUser.isBiometricVerified,
        fcmToken: freshUser.fcmToken,
        dateofbirth: freshUser.dateofbirth,
        number: freshUser.number,
        location: freshUser.location,
        notificationStatus: freshUser.notificationStatus,
        bio: freshUser.bio
      }
    }
  };
};



const verifyBiometric = async (data) => {
  const { key, biometricData, role } = data;

  const validRoles = ["user", "instructor", "mentor"];
  if (!validRoles.includes(role)) {
    return { status: 400, data: { message: 'Invalid role.' } };
  }

  const user = await User.findOne({ biometricData: key, role: role.toLowerCase() });
  if (!user || !await compareBiometric(biometricData, user.biometricDataVal)) {
    return { status: 401, data: { message: "Biometric mismatch" } };
  }

  if (!user.isVerified) {
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
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
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center;">
        <div style="font-size: 80px; color: #333;">🔒</div>
        <div style="background: #144fa9db; padding: 30px; border-radius: 4px; color: #fff; font-size: 20px; margin: 20px 0;">
          <div style="font-size: 30px; font-weight: 800; margin: 7px 0;">Back In The Ring</div>
          <div style="font-family: monospace;">Your Account is not verified yet.</div>
          <div style="margin-top: 25px, font-size: 25px, letter-spacing: 3px;">Please Verify Your Email Address</div>
          <div style="font-size: 35px; margin-top: 15px;">📧</div>
        </div>

        <h2 style="margin: 20px 0 10px;">Hello, ${user.name}</h2>
        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px dashed #007bff; color: #007bff; margin: 20px 0;">
          ${otp}
        </div>

        <p style="margin-top: 10px;">Please use this OTP to complete your verification. The OTP is valid for the next 10 minutes.</p>
        <a href="#" style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #007bff; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">Verify Now</a>
      </div>

      <div style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
        <p>If you did not request this OTP, please <a href="#" style="color: #007bff; text-decoration: none;">contact us</a> immediately.</p>
        <p>Thank you,<br>The All In The Ring Team</p>
      </div>
    </div>
  </div>
    `;

    await transporter.sendMail({
      from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
      to: data.email,
      subject: `Dear ${user.name}, Verify Your Email using the code below.`,
      html: htmlBody,
    });

    return {
      status: 403,
      data: { message: 'You have not verified your email. Please verify your email first.' }
    };
  }

  if (user.user_status !== 1) {
    return { status: 403, data: { message: 'Your account is inactive. Contact admin.' } };
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);
  const biometricHash = await assignUniqueSecretHash(user);

  user.biometricData = biometricHash;
  user.refreshToken = refreshToken;
  await user.save();

  return {
    status: 200,
    data: {
      message: 'Login successful',
      accessToken,
      refreshToken,
      biometricHash,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isBiometricVerified: user.isBiometricVerified,
        dateofbirth: user.dateofbirth,
        number: user.number,
        location: user.location,
        bio: user.bio
      }
    }
  };
};



const adminRegister = async (data, role, uploadFile) => {
  try {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      if (existingUser.user_status === 1) {
        return { status: 400, data: { message: 'User already exists' } };
      } else if (existingUser.user_status === 2) {
        return { status: 400, data: { message: 'User already exists, but account is blocked' } };
      }
    }

    const ins_ip = data.ip || data.connection?.remoteAddress || 'N/A';
    const isVerified = true;
    const user_status = 1;
    const otp = null;
    const otpExpiry = null;

    let hash;
    while (true) {
      hash = generateSecretHash();
      const existing = await User.findOne({ biometricData: hash });
      if (!existing) break;
    }

    let biohash;
    while (true) {
      biohash = generateSecretHash();
      const existing = await User.findOne({ biometricDataVal: biohash });
      if (!existing) break;
    }

    const user = new User({
      role: role,
      name: data.name,
      profilePicture: uploadFile && uploadFile.length > 0
        ? (typeof uploadFile[0] === "string"
          ? uploadFile[0]
          : uploadFile[0]?.url || null)
        : null,
      number: data.number,
      email: data.email,
      password: data.password,
      location: data.location,
      dateofbirth: data.dateofbirth,
      prisonerid: data.prisonerid,
      expertise: data.expertise,
      biometricData: hash,
      biometricDataVal: biohash,
      otp,
      otpExpiry,
      isVerified,
      user_status,
      ins_ip,
      notificationStatus: true,
    });

    await user.save();

    const welcomeHtmlBody = `
      <div style="font-family: Arial, sans-serif; background: #f6f9fc; padding: 32px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px #e1e6ef; overflow: hidden;">
          <div style="background: #144fa9; color: #fff; padding: 32px 20px 16px 20px; text-align: center;">
            <h1 style="margin-bottom: 6px;font-size:2em;">Welcome, ${data.name}!</h1>
            <p style="font-size: 20px; margin:0;">You’ve just joined <b>Back In The Ring</b> as a <b style="text-transform:capitalize;">${role}</b></p>
          </div>
          <div style="padding: 25px 24px 10px 24px;">
            <h2 style="color: #144fa9; font-size: 1.3em; margin-bottom: 12px;">Your Details</h2>
            <table style="width:100%;color:#555;font-size:16px;">
              <tr>
                <td><b>Name:</b></td>
                <td>${data.name}</td>
              </tr>
              <tr>
                <td><b>Email:</b></td>
                <td>${data.email}</td>
              </tr>
              ${data.number ? `<tr><td><b>Mobile:</b></td><td>${data.number}</td></tr>` : ''}
              <tr>
                <td><b>Role:</b></td>
                <td style="text-transform:capitalize;">${role}</td>
              </tr>
            </table>

            <div style="margin:26px 0 16px 0; padding: 16px; background: #f2f6fa; border-radius:8px; color: #555;">
              <b>We're excited to have you onboard!</b>
            </div>

            <div style="margin:28px 0;">
              <h3 style="color: #144fa9; margin-bottom:10px;">Get Our App!</h3>
              <div style="display: flex; justify-content:center; gap: 20px;">
                <a href="https://demo.android.download.link" style="text-decoration:none;">
                  <div style="display:flex;align-items:center;">
                    <button style="
                      padding:14px 28px;
                      background: linear-gradient(90deg, #1ec773 70%, #12ce62 100%);
                      color: #fff;
                      font-weight: bold;
                      border: none;
                      border-radius: 8px;
                      font-size: 18px;
                      box-shadow: 0px 2px 8px #d5ebda;
                      cursor:pointer;
                    ">
                      Download for Android
                    </button>
                  </div>
                </a>
                <a href="https://demo.apple.download.link" style="text-decoration:none;">
                  <div style="display:flex;align-items:center;">
                    <button style="
                      padding:14px 28px;
                      background: linear-gradient(90deg, #2952e3 70%, #5d8cf8 100%);
                      color: #fff;
                      font-weight: bold;
                      border: none;
                      border-radius: 8px;
                      font-size: 18px;
                      box-shadow: 0px 2px 8px #d5e2fa;
                      cursor:pointer;
                    ">
                      Download for Apple
                    </button>
                  </div>
                </a>
              </div>
            </div>

            <div style="margin:24px 0; padding: 14px; background:#fffbeb; border-radius:7px; color:#967400; font-size:16px;">
              <b>Important:</b> Please change your password on your first login for security.
            </div>

            <hr style="margin:28px 0 12px 0; border:0;border-top:1px solid #ececec;" />
            <p style="font-size:14px; color:#7a7a8c; text-align:center;">
              This is a System Generated Email please Do Not Reply ,
              <span style="font-size:13px; color:#bdbdbd;">— All Back In The Ring Team</span>
            </p>
          </div>
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});


    await transporter.sendMail({
      from: `"All Back In The Ring" <${process.env.SMTP_EMAIL}>`,
      to: data.email,
      subject: `Welcome, ${data.name} – All Back In The Ring!`,
      html: welcomeHtmlBody,
    });

    return { status: 201, data: { message: 'User Created Successfully!!' } };
  } catch (err) {
    console.error('Error during signup:', err);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
};





const refreshToken = async (data) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(data.refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return { status: 401, data: { message: 'Invalid or expired refresh token' } };
    }

    const user = await User.findOne({ refreshToken: data.refreshToken });
    if (!user) {
      return { status: 404, data: { message: 'Invalid Refresh Token' } };
    }

    const accessToken = generateAccessToken(user);

    return { status: 200, data: { message: 'Token refreshed', accessToken } };
  } catch (err) {
    console.error('Error during refresh token:', err);
    return { status: 500, data: { message: 'Internal Server Error' } };
  }
}

const updateUser = async (userId, userData, uploadedUrls) => {
  try {
    const updateData = { ...userData };

    if (updateData.password) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.default.hash(updateData.password, 10);
    }

    const restrictedFields = ['_id', 'createdAt', 'updatedAt', 'email'];
    restrictedFields.forEach(field => delete updateData[field]);

    if (uploadedUrls && uploadedUrls.length > 0) {
      updateData.profilePicture = typeof uploadedUrls[0] === "string"
        ? uploadedUrls[0]
        : uploadedUrls[0]?.url || null;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return { status: 404, data: { status: 'error', message: 'User not found' } };
    }

    return { status: 200, data: { status: 'success', data: updatedUser } };
  } catch (error) {
    console.error('Update Error:', error);
    return { status: 500, data: { status: 'error', message: 'Internal Server Error', error: error.message } };
  }
};

export default {
  register,
  login,
  verifyBiometric,
  verifyPasswordOtp,
  verifyOtp,
  resetPassword,
  forgetPassword,
  saveBiometric,
  adminRegister,
  refreshToken,
  updateUser
};