import { Router } from "express";

const router = Router();

// Get discovery service status
router.get("/discovery/status", (req, res) => {
  // This would typically come from your actual discovery service
  res.json({
    running: false,
    startBlock: 0,
    currentBlock: 0,
  });
});

// Start discovery service
router.post("/discovery/start", (req, res) => {
  // This would typically call your discovery service's start method
  res.json({
    success: true,
    message: "Discovery service started",
  });
});

// Stop discovery service
router.post("/discovery/stop", (req, res) => {
  // This would typically call your discovery service's stop method
  res.json({
    success: true,
    message: "Discovery service stopped",
  });
});

export default router;
