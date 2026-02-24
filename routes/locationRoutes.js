import { Router } from 'express';

import locationController from "../controllers/locationController.js";

const router = Router();

router.post("/addLocation", locationController.addLocation);
router.get("/getAllLocations", locationController.getAllLocations);
router.get("/getLocationById/:id", locationController.getLocationById);
router.put("/updateLocation/:id", locationController.updateLocation);
router.delete("/deleteLocation/:id", locationController.deleteLocation);
router.patch("/changeStatus/:id", locationController.changeStatus);

export default router;