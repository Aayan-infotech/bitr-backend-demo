import { Router } from 'express';
import journelController from '../controllers/addJournelController.js';  

const router = Router();

router.post('/create/:classId', journelController.createJournal);
router.get('/getByClass/:classId', journelController.getJournalsByClassId)
router.get('/getJournals/:instructorId', journelController.getJournalsByInstructor)
router.delete('/deleteJournel/:journalId', journelController.deleteJournal)
router.get('/getByJournalId/:journalId', journelController.getByJournalId);
router.post('/addNote/:journalId', journelController.addNoteToJournal);
router.get('/getJournalsForMentor/:mentorId', journelController.getJournalsForMentor);
router.get('/getJournalForAdmin' ,journelController.getAdminJournals )
export default router;