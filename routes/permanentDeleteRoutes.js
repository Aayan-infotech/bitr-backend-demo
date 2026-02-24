
import express from "express";
import { deleteUserByAdmin ,getDeletedUsersLogs} from "../controllers/permanentDelete.js";
import authMiddleware from '../middlewares/authMiddleware.js';
import {strictApiLimiter } from '../middlewares/apiRateLimitter.js';

const router = express.Router();

router.delete("/delete/:userId",strictApiLimiter, deleteUserByAdmin);
router.get("/getLogs",getDeletedUsersLogs );

export default router;
