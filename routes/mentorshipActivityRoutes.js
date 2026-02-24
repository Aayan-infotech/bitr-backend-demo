import { Router } from 'express';
import mentorshipActivityController from "../controllers/mentorshipActivityController.js";

const router = Router();

router.post('/createActivity/:mentorId', mentorshipActivityController.createActivity);
router.get('/getAll', mentorshipActivityController.getAllActivities);
router.get('/getById/:id', mentorshipActivityController.getActivityById);
router.put('/updateActivity/:id', mentorshipActivityController.updateActivity);
router.delete('/deleteActivity/:id', mentorshipActivityController.deleteActivity);
router.get('/getActivityByMentor/:mentorId', mentorshipActivityController.getActivitiesByMentor);
router.patch('/assignUsers/:activityId', mentorshipActivityController.assignUsersToActivity);
router.get('/getActivitiesForUser/:userId', mentorshipActivityController.getActivitiesForUser);
router.patch('/markAttendance/:activityId', mentorshipActivityController.markAttendanceAndAddNotes);

export default router;
