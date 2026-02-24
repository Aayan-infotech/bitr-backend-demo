import { Router } from 'express';
import milestonesController from '../controllers/milestonesController.js';

const router = Router();

router.get('/getReport/:userId', milestonesController.getUserMilestonesReport);

router.get('/downloadReport/:userId', milestonesController.downloadUserReport);

router.get('/generateCertificate/:userId/:classId', milestonesController.generateAppreciationCertificate);

router.get('/mentorshipActivityOverview/:activityId', milestonesController.mentorshipActivityOverview);

router.get('/userMilestones/:userId', milestonesController.getUserMilestonesCount);

export default router;
