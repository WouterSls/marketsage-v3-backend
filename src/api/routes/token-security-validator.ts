import { Router } from "express";

const router = Router();

router.get("/token-security-validator/status", (req, res) => {
  res.json({
    status: "ok",
  });
});

router.post("/token-security-validator/validate", (req, res) => {
  res.json({
    status: "ok",
  });
});

export default router;
