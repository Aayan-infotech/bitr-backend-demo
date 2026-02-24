import express from 'express';
import {
  addStaticContent,
  getStaticContentBySection
} from '../controllers/staticContentController.js';

const router = express.Router();

router.post('/add', addStaticContent);
router.get('/get/:section', getStaticContentBySection);

export default router;
