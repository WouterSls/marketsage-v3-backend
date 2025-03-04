import { Router } from "express";
import { QueueManager } from "../../lib/queues/QueueManager";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
  });
});

router.get("/queues/stats", (req, res) => {
  const queueManager = QueueManager.getInstance();
  const stats = queueManager.getQueueStats();
  res.json(stats);
});

export default router;
