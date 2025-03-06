import { Router } from "express";
import { TokenMonitorController } from "./TokenMonitorController";

const router = Router();

router.get("/token-monitor/status", TokenMonitorController.getStatus);
router.get("/token-monitor/positions", TokenMonitorController.getAllPositions);
router.get("/token-monitor/active-positions", TokenMonitorController.getActivePositions);
router.get("/token-monitor/tokens", TokenMonitorController.getAllTokens);
router.get("/token-monitor/trades", TokenMonitorController.getAllTrades);

export default router;
