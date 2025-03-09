import { Router } from "express";
import { TokenDiscoveryController } from "./TokenDiscoveryController";

const router = Router();

router.get("/token-discovery/status", TokenDiscoveryController.getStatus);

router.post("/token-discovery/start", TokenDiscoveryController.startService);
router.post("/token-discovery/stop", TokenDiscoveryController.stopService);
router.post("/token-discovery/retry-verification", TokenDiscoveryController.retryVerification);

export default router;
