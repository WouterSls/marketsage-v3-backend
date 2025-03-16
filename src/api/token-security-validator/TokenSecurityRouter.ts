import { Router } from "express";
import { TokenSecurityValidatorController } from "./TokenSecurityController";

const router = Router();

router.get("/token-security-validator/active-tokens", TokenSecurityValidatorController.getActiveTokens);
router.get("/token-security-validator/token-liquidity", TokenSecurityValidatorController.getLiquidity);

router.post("/token-security-validator/token", TokenSecurityValidatorController.addNewToken);

export default router;
