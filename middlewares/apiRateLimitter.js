import rateLimit from "express-rate-limit";

/**
 * API-specific rate limiter
 * Use this ONLY on sensitive or heavy APIs
 */
export const strictApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,                // max 10 calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,    
    message: "Too many requests to this endpoint. Please wait."
  }
});

/**
 * Slightly relaxed limiter (for login / OTP)
 */
export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                 // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many authentication attempts. Try later."
  }
});
