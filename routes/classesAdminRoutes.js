import { Router } from 'express';
import classesAdminController from '../controllers/classesAdminController.js';
import multer from "multer";
import authMiddleware from '../middlewares/authMiddleware.js';


const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/addClass',upload.single("Image"), classesAdminController.addClass);
router.put('/updateClass/:classId', upload.single("Image"), classesAdminController.editClass);
router.patch('/blockClass/:classId', classesAdminController.blockClass);
router.delete('/deleteClass/:classId', classesAdminController.deleteClass);
router.get('/getClassById/:classId',authMiddleware, classesAdminController.getClassById);
router.get('/getAllClasses', classesAdminController.getAllClasses);
router.get('/getActiveClasses', classesAdminController.getActiveClasses);
router.get('/getClassesList',authMiddleware, classesAdminController.getUpcomingClasses);
router.get('/getClassesByDate/:date', classesAdminController.getClassesByDate);
router.get('/getRecommendedClasses/:userId', classesAdminController.getRecommendedClasses);

router.put("/resetInterests", authMiddleware, classesAdminController.resetUserInterests);
router.get("/myEvents", authMiddleware, classesAdminController.getMyEvents);
router.get("/getClassByIdAdmin/:classId",classesAdminController.getClassByIdAdmin);
router.get("/getSessionAttendence/:classId/:sessionId" , classesAdminController.getSessionAttendanceAndRegistration);
router.get("/getAllUpcomingClasses" ,classesAdminController.getAllUpcomingClasses )
router.get("/getMyClassById/:classId",authMiddleware, classesAdminController.getMyClassById)


export default router;
