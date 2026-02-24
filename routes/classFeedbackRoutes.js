import { Router } from 'express';

import classFeedback from "../controllers/feedbackClassController.js";

const router = Router();

router.post("/giveFeedback/:classId", classFeedback.giveFeedback);
router.get("/getAllFeedbacks/:classId",classFeedback.getAllFeedbacks);
router.get("/getByUser/:classId/:userId",classFeedback.getFeedbackByUser);
router.put("/updateFeedback/:classId/:userId",classFeedback.editFeedback);
router.delete("/deleteFeedback/:classId/:userId/:sessionId", classFeedback.deleteFeedback)

export default router;