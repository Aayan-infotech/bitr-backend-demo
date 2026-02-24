import { Router } from 'express';
import multer from "multer";
import addNotesController from "../controllers/addNotesController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/addNotes/:classId",
  upload.single("uploadFile"),     
  addNotesController.addNotes
);
router.get("/getNoteById/:classId", addNotesController.getNoteById);
router.delete("/deleteNote/:classId/:noteId",addNotesController.deleteNote);

export default router;
