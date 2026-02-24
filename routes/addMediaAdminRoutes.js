import { Router } from 'express';
import addMediaAdminController from '../controllers/addMediaAdminController.js';
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });


const router = Router()

router.post('/addMedia/:classId', upload.single("uploadVideo"), addMediaAdminController.addMedia);
router.get('/getAllMedia/:classId', addMediaAdminController.getAllMedia);
router.get('/getMediaById/:classId/:mediaId', addMediaAdminController.getMediaById);
router.delete('/deleteMedia/:classId/:mediaId', addMediaAdminController.deleteMedia);
router.put('/updateMedia/:classId/:mediaId', upload.single("uploadVideo"), addMediaAdminController.updateMedia);

export default router;