import rateLimit from "express-rate-limit";


const serverRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 120,      
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests. Please slow down."
  }
});

export default serverRateLimiter;
