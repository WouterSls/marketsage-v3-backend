import express from "express";
import { Services } from "../../services";
import { ethers } from "ethers";

const router = express.Router();

/**
 * Get the status of all background services
 */
router.get("/services/status", (req, res) => {
  try {
    // Get provider from the app config
    const provider = req.app.get("provider") as ethers.Provider;

    // Get services instance
    const services = Services.getInstance(provider);

    // Get status
    const status = services.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error getting services status", error);
    res.status(500).json({
      success: false,
      error: "Failed to get services status",
    });
  }
});

export default router;
