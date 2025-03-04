import { Router } from "express";
import { TokenDiscoveryManager } from "../../token-discovery/TokenDiscoveryManager";

const router = Router();

router.get("/token-discovery/status", (req, res) => {
  const status = TokenDiscoveryManager.getInstance().getStatus();

  res.json({
    running: status.isRunning,
    statistics: status.statistics,
  });
});

router.post("/token-discovery/start", (req, res) => {
  TokenDiscoveryManager.getInstance().start();
  res.json({
    success: true,
    message: "Token discovery service started",
  });
});

router.post("/token-discovery/stop", (req, res) => {
  TokenDiscoveryManager.getInstance().stop();
  res.json({
    success: true,
    message: "Token discovery service stopped",
  });
});

export default router;
