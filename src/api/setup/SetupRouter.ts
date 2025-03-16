import { Router } from "express";
import { SetupController } from "./SetupController";

const router = Router();

router.get("/setup/wallet-info", SetupController.getWalletInfo);

router.post("/setup/wallet", SetupController.setupWallet);

export default router;
