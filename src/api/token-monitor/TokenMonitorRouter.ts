import { Router } from "express";
import { TokenMonitorController } from "./TokenMonitorController";

const router = Router();

router.get("/token-monitor/tokens/:address", TokenMonitorController.getTokenByAddress);
router.get("/token-monitor/tokens", TokenMonitorController.getAllTokens);
router.get("/token-monitor/buyable-tokens", TokenMonitorController.getBuyableTokens);
router.get("/token-monitor/trades", TokenMonitorController.getAllTrades);
router.get("/token-monitor/positions", TokenMonitorController.getAllPositions);
router.get("/token-monitor/active-positions", TokenMonitorController.getActivePositions);

router.post("/token-monitor/buy-token", TokenMonitorController.buyToken);
router.post("/token-monitor/sell-token", TokenMonitorController.monitorToken);
router.post("/token-monitor/monitor-token", TokenMonitorController.monitorToken);

export default router;
