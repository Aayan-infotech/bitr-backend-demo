import { Router } from 'express';
import assignUserController from '../controllers/assignUsersByInstructorController.js';  

const router = Router();

router.get('/getUsersByLocation/:instructorId', assignUserController.getUsersByInstructorLocation);
router.post('/assignToInstructor/:instructorId', assignUserController.assignUsersToInstructor);
router.get('/instructorsTeam/:instructorId', assignUserController.getInstructorTeam)
export default router;