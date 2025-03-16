import { Router } from "express";
import { DataController } from "./DataController";

const router = Router();

router.get("/data/statistics", DataController.getStatistics);

export default router;
