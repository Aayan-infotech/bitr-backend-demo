import express from 'express';
import supportController from '../controllers/supportController.js';
import multer from "multer";
import authMiddleware from '../middlewares/authMiddleware.js';
//import {  } from '../middleware/authMiddleware.js'; // ensure user is logged in

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const allowedAttachments = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg',
    'application/pdf'
  ];
  const invalid = req.files.find(file => !allowedTypes.includes(file.mimetype));
  if (invalid) {
    return res.status(400).json({
      status: "error",
      message: "Only image files (jpeg, png, gif, webp, jpg) and PDF files are allowed."
    });
  }
  next();
};


router.post('/create/:userId', upload.array("files"), allowedAttachments, supportController.createTicket);
router.post('/message/:userId',  upload.array("files"), allowedAttachments, supportController.addMessage);
router.get('/meta/:ticketId',  supportController.getTicketMeta);
router.get('/tickets',  supportController.getTicketAll);
router.get('/thread/:ticketId',  supportController.getTicketThread);
router.put('/close/:ticketId/:ticketStatus',  supportController.closeTicket);
router.get('/getUserTickets', authMiddleware , supportController.getUserTickets);

export default router;
