import { Router } from 'express';

import instructorController from "../controllers/instructorController.js";

const router = Router();

router.get('/dashboardStats/:instructorId' , instructorController.instructorDashboardStats);
router.get('/upcomingClasses/:instructorId', instructorController.upcomingClassesWithSessions);
router.get('/classDetails/:classId', instructorController.getInstructorClassById);
router.get("/getByLocation/:locationId", instructorController.getInstructorsByLocation);
router.get("/getAllClassesByInstructor/:instructorId", instructorController.getAllClassesForInstructor);
router.get("/getClassData/:classId", instructorController.getClassSessionsWithNotesAndMedia);
router.get("/getSessionDetails/:classId/:sessionId", instructorController.getSessionDetails);
router.get("/getTrendingInstructors", instructorController.getTrendingInstructors)

export default router;