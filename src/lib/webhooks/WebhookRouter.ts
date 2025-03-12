import { Router } from "express";
import { WebhookController } from "./WebhookController";

const router = Router();

router.get("/webhooks", WebhookController.getWebhooks);
router.post("/webhooks", WebhookController.createWebhook);
router.delete("/webhooks/:id", WebhookController.deleteWebhook);

router.post("/webhooks/test", WebhookController.broadcastTestTokenUpdate);

export default router;
