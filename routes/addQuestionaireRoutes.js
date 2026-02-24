import { Router } from 'express';
import questionaireController from '../controllers/addQuestionaireController.js';  

const router = Router();

router.post('/addQuestions/:classId', questionaireController.createQuestionaire);
router.get('/getQuestions/:classId', questionaireController.getQuestionaire )
router.post('/submitAnswers/:classId', questionaireController.submitAnswers)
router.put('/editQuestion/:classId/:questionId' ,questionaireController.editQuestion)
router.get('/getUserQuestionnaireWithAnswers/:classId/:userId', questionaireController.getUserQuestionnaireWithAnswers);

export default router;