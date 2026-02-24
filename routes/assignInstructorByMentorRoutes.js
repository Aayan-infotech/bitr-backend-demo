import { Router } from 'express';
import assignInstructorController from '../controllers/assignInstructorByMentorController.js';  

const router = Router();

router.get('/getInstructorByLocation/:mentorId', assignInstructorController.getInstructorByMentorLocation);
router.get('/getUsersByInstructor/:instructorId', assignInstructorController.getUsersOfInstructorTeam);
router.post('/assignInstructorAndUsers/:mentorId', assignInstructorController.assignUsersUnderInstructorByMentor);
router.get('/getMentorTeam/:mentorId', assignInstructorController.getMentorTeam);
router.get('/getUsersUnderMentor/:mentorId', assignInstructorController.getUsersUnderMentor);
export default router;