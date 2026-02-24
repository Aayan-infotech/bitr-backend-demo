import express from 'express';
import mongoose from './config/db.js';
import logger from './middlewares/logger.js';
import authRoutes from './routes/authRoutes.js';
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import path from "path";

import adminRoutes from './routes/adminRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import classAdminRoutes from './routes/classesAdminRoutes.js';
import addMediaAdminRoutes from './routes/addMediaAdminRoutes.js';
import addPrisonerRoutes from './routes/addPrisonerRoute.js';
import addNotesRoutes from './routes/addNotesRoute.js';
import registerClassRoutes from './routes/registerClassRoutes.js';
import classFeedbackRoutes from './routes/classFeedbackRoutes.js';
import QuestionaireRoutes from './routes/addQuestionaireRoutes.js';
import journelRoutes from './routes/addJournelRoutes.js';
import assignUserRoutes from './routes/assignUserByInstructorRoutes.js';
import assignInstructorRoutes from './routes/assignInstructorByMentorRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import prisonerAttendenceRoutes from './routes/prisonerAttendenceRoutes.js';
import mentorRoutes from './routes/mentorRoutes.js';
import mentorshipActivity from './routes/mentorshipActivityRoutes.js';
import notification from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import milestonesRoutes from './routes/milestonesRoutes.js';
import staticContentRoutes from './routes/staticContentRoutes.js';
import permanentDelete from './routes/permanentDeleteRoutes.js'

import cron from "node-cron";
import notificationController from "./controllers/notificationController.js";
import { checkCertificateEligibilityAndSendEmail } from './controllers/milestonesController.js';

import cors from "cors";
import moment from "moment-timezone";
import geoip from "geoip-lite";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const UAParser = require('ua-parser-js');

import serverRateLimiter from "./middlewares/serverRateLimiter.js";

const app = express();
app.set('trust proxy', true);

app.use(express.json());
app.use(logger);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const uploadBaseDir = process.env.NODE_ENV === 'production'
  ? '/app/uploads'
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

app.use("/files", express.static(uploadBaseDir));

app.use("/api", serverRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/AdminClasses', classAdminRoutes);
app.use('/api/mediaAdmin', addMediaAdminRoutes);
app.use('/api/prisoner', addPrisonerRoutes);
app.use('/api/notes', addNotesRoutes);
app.use('/api/register', registerClassRoutes);
app.use('/api/feedback', classFeedbackRoutes);
app.use('/api/questionaire', QuestionaireRoutes);
app.use('/api/journel', journelRoutes);
app.use('/api/assignUsers', assignUserRoutes);
app.use('/api/assignInstructor', assignInstructorRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/incident', incidentRoutes);
app.use('/api/prisonerAttendence', prisonerAttendenceRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/mentorshipActivity', mentorshipActivity);
app.use('/api/notification', notification);
app.use('/api/milestones', milestonesRoutes);
app.use('/api/static-content', staticContentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/permanentDelete',permanentDelete )

const logsDir = path.join(process.cwd(), "logs");
const apiLogFile = path.join(logsDir, "api.log");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
if (!fs.existsSync(apiLogFile)) fs.writeFileSync(apiLogFile, "");

app.use((req, res, next) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.ip;

  const cleanedIp =
    ip === "::1" || ip.startsWith("::ffff:127.")
      ? "127.0.0.1"
      : ip;

  const geo = geoip.lookup(cleanedIp) || {};
  const now = moment().tz("Asia/Kolkata");
  const formattedTime = now.format("YYYY-MM-DD | hh:mm:ss A z");

  const ua = new UAParser(req.headers["user-agent"]).getResult();

  const logEntry = `
==================== API Request Log ====================
Time   : ${formattedTime}
IP     : ${cleanedIp}
Method : ${req.method}
URL    : ${req.originalUrl}
Country: ${geo.country || "N/A"}
OS     : ${ua.os.name || "N/A"}
Browser: ${ua.browser.name || "N/A"}
========================================================\n`;

  fs.appendFile(apiLogFile, logEntry, () => {});
  next();
});

async function runReminderCron() {
  try {
    const req = {};
    const res = {
      status: () => ({ json: () => {} })
    };
    await notificationController.sendClassReminders(req, res);
  } catch (err) {
    console.error("[CRON ERROR]:", err);
  }
}

cron.schedule("0 * * * *", runReminderCron);
cron.schedule("0 */12 * * *", checkCertificateEligibilityAndSendEmail);

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
