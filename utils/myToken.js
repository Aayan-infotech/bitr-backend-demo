const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id ,user_status: user.user_status}, process.env.JWT_SECRET, { expiresIn: '1m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '5m' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
}; 

const regenerateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
}; 

module.exports = { generateAccessToken, generateRefreshToken, generateOTP, regenerateOTP };
