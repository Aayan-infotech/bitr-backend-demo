import express from "express";
import notificationController from "../controllers/notificationController.js";
const router = express.Router();
import authMiddleware from '../middlewares/authMiddleware.js';

router.post("/send", notificationController.sendNotification);
router.get("/getByUser/:userId" , notificationController.getNotificationsByUserId)
router.post("/send-class-reminders", notificationController.sendClassReminders);
router.post("/markAsRead/:notificationId" ,authMiddleware , notificationController.markAsRead);
router.delete("/deleteForUser/:notificationId", authMiddleware, notificationController.deleteNotificationForUser);
router.post("/changeNotificationStatus", authMiddleware , notificationController.notificationSettings);
router.post('/sendChatNotification', notificationController.sendChatNotification);


export default router;
