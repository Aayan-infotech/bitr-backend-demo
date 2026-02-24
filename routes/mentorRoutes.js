import { Router } from 'express';

import mentorController from "../controllers/mentorController.js";

const router = Router();

router.get('/getIAssignedInstructor/:mentorId',mentorController.getInstructorsByMentor)
router.get('/getUpcomingInstructorClasses/:mentorId',mentorController.getLiveOrUpcomingClassesForMentor)
router.get('/getInstructorData/:instructorId', mentorController.getInstructorDashboardSummary)
router.get('/assignedUsers/:instructorId', mentorController.getAssignedUsersForInstructor)
router.get('/assignedPrisoners/:instructorId', mentorController.getAssignedPrisonersForInstructor)





export default router;