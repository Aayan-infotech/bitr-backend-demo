import express from 'express';
import {
    markAttendance,
  registerUserToClass,
  getRegisteredUsersWithAttendance,
  participationOverview,
  dashboardCounts
} from '../controllers/registerClassController.js';

const router = express.Router();

router.post('/register/:classId', registerUserToClass);
router.post('/markAttendence/:classId/:sessionId', markAttendance);
router.get('/getRegistredUserWithAttendence/:classId',getRegisteredUsersWithAttendance)
router.get('/getParticipationOverview',participationOverview)
router.get('/dashboardCounts',dashboardCounts )
export default router;
