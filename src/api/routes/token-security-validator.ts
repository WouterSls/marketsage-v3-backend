import { Router } from "express";
import { TokenSecurityValidator } from "../../token-security-validator/TokenSecurityValidator";
import { TokenValidationItem } from "../../lib/queues/QueueTypes";
import { ActiveToken } from "../../token-security-validator/models/token-security-validator.types";

const router = Router();

router.get("/token-security-validator/status", (req, res) => {
  const status = TokenSecurityValidator.getInstance().getStatus();

  res.json({
    status: "ok",
    statistics: status.statistics,
  });
});

router.post("/token-security-validator/token", async (req, res) => {
  const token: { address: string; creatorAddress: string; discoveredAt: number } = req.body;

  try {
    const activeToken = await TokenSecurityValidator.getInstance().addNewToken(token);

    res.json({
      status: "ok",
      activeToken,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: (error as Error).message,
    });
  }
});

router.get("/token-security-validator/liquidity-check", async (req, res) => {
  res.json({
    status: "not implemented",
  });
});

export default router;
