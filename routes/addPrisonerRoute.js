import {Router} from 'express';
import prisonerController from '../controllers/addPrisonerController.js';  

const router = Router();

router.post('/addPrisoner', prisonerController.addPrisoner);
router.get('/getPrisoners', prisonerController.getPrisoners);
router.get('/getPrisoner/:prisonerId', prisonerController.getPrisonerById);
router.put('/updatePrisoner/:prisonerId', prisonerController.updatePrisoner);
router.delete('/deletePrisoner/:prisonerId', prisonerController.deletePrisoner);
router.get('/prisonersByInstructor/:instructorId/:classId', prisonerController.getPrisonersByInstructorApp);
router.get('/prisonersByInstructor/:instructorId', prisonerController.getPrisonersByInstructor);
router.patch("/changePrisonerStatus/:prisonerId", prisonerController.changePrisonerStatus);

export default router;