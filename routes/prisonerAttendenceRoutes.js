import { Router } from 'express';

import prisonerAttendenceController from "../controllers/prisonerAttendenceController.js";

const router = Router();

router.post("/mark/:classId" ,prisonerAttendenceController.markAttendanceForPrisoners);
router.put("/updatePrisoner/:classId",prisonerAttendenceController.updateAttendanceForPrisonersBySessionId)
router.get("/getSession/:classId/:date", prisonerAttendenceController.getSessionByDate)
router.get("/getSessionAttendence/:classId/:sessionId", prisonerAttendenceController.getSessionAttendanceById)


export default router;