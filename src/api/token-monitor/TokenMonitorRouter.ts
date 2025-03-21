import { Router } from "express";
import { TokenMonitorController } from "./TokenMonitorController";

const router = Router();

router.get("/token-monitor/tokens/:address", TokenMonitorController.getTokenByAddress);

router.post("/token-monitor/tokens/:address/buy", TokenMonitorController.buyToken);
router.post("/token-monitor/tokens/:address/sell", TokenMonitorController.sellToken);
router.post("/token-monitor/tokens/:address/monitor", TokenMonitorController.monitorToken);
router.put("/token-monitor/tokens/:address/archive", TokenMonitorController.archiveToken);

router.get("/token-monitor/tokens", TokenMonitorController.getTokens);
router.get("/token-monitor/trades", TokenMonitorController.getTrades);
router.get("/token-monitor/positions", TokenMonitorController.getPositions);
router.get("/token-monitor/active-positions", TokenMonitorController.getActivePositions);

export default router;
