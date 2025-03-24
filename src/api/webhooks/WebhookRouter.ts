import { Router } from "express";
import { WebhookController } from "./WebhookController";

const router = Router();

router.get("/webhooks", WebhookController.getWebhooks);
router.post("/webhooks", WebhookController.createWebhook);
router.delete("/webhooks/:id", WebhookController.deleteWebhook);

router.post("/webhooks/token-test", WebhookController.broadcastTestTokenUpdate);
router.post("/webhooks/trade-test", WebhookController.broadcastTestTradeReceive);

export default router;
