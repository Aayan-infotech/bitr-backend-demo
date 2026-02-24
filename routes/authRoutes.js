import { Router } from 'express';
import authController from '../controllers/authController.js';
import multer from "multer";

import { validateAdminSignupInput } from "../middlewares/validateAdminSignupInput.js";
import { validateSignupInput } from "../middlewares/validateSignupInput.js";
import { validateOTPInput } from "../middlewares/validateOTPInput.js";
import { validateForgetPasswordInput } from "../middlewares/validateForgetPasswordInput.js";
import { validateResetPasswordInput } from "../middlewares/validateResetPasswordInput.js";
import { validateLoginInput } from "../middlewares/validateLoginInput.js";

import { authApiLimiter, strictApiLimiter } from '../middlewares/apiRateLimitter.js';

import rateLimit from "express-rate-limit";
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const forgetPasswordLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.body.email || req.ip,
  message: {
    status: "error",
    message: "You can only request password reset once every 2 minutes. Please try again later."
  }
});

const onlyImages = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  const invalid = req.files.find(file => !allowedTypes.includes(file.mimetype));

  if (invalid) {
    return res.status(400).json({
      status: "error",
      message: "Only image files are allowed (jpeg, png, gif, webp, jpg)."
    });
  }
  next();
};

const checkFormData = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      status: "error",
      message: "Only multipart/form-data content type is allowed.",
    });
  }
  next();
};

router.post(
  '/adminRegister/:role',
  upload.array("files"),
  onlyImages,
  validateAdminSignupInput,
  authController.adminRegister
);

router.post(
  '/register/:role',
  upload.array("files"),
  validateSignupInput,
  authController.register
);

router.post(
  '/verify-otp',
  authApiLimiter,
  validateOTPInput,
  authController.verifyOtp
);

router.post(
  '/forget-password',
  forgetPasswordLimiter,
  validateForgetPasswordInput,
  authController.forgetPassword
);

router.post(
  '/verify-passsword-otp',
  authApiLimiter,
  validateOTPInput,
  authController.verifyPasswordOtp
);

router.post(
  '/reset-password',
  strictApiLimiter,
  validateResetPasswordInput,
  authController.resetPassword
);

router.post('/save-biometric', authController.saveBiometric);
router.post('/login-biometric/:role', authController.verifyBiometric);

router.post(
  '/login/:role',
  authApiLimiter,
  validateLoginInput,
  authController.login
);

router.post(
  '/refresh-token',
  authApiLimiter,
  authController.refreshToken
);

router.put(
  '/update-user/:userId',
  upload.array("files"),
  checkFormData,
  authController.updateUser
);

router.post('/logout/:userId', authController.logout);
router.delete('/delete-account/:userId', authController.deleteAccount);

export default router;
