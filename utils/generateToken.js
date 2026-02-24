import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();


export const generateToken = (id, role, hash, expiry) => {
  return jwt.sign({ id, role, hash }, process.env.JWT_SECRET, { expiresIn: expiry });
};

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id ,user_status: user.user_status}, process.env.JWT_SECRET, { expiresIn: '2m' });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '180d' });
};
export const generateWebAccessToken = (user) => {
  return jwt.sign({ id: user }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '180d' });
};

export const generateOTP = () => {
  return 1234;
};

export const regenerateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};