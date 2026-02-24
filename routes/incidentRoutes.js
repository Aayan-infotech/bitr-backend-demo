import { Router } from 'express';

import incidentController from "../controllers/incidentController.js";

const router = Router();

router.post("/addIncident/:instructorId",incidentController.reportIncident );
router.get('/getIncidentsByClass/:classId', incidentController.getIncidentsByClassId);
router.get('/getIncidentBySession/:sessionId', incidentController.getIncidentsBySessionId);
router.get('/getById/:incidentId', incidentController.getIncidentById);
router.put('/updateIncident/:incidentId', incidentController.updateIncident);
router.delete('/deleteIncident/:incidentId', incidentController.deleteIncident);

export default router;