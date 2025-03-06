import { Request, Response } from "express";
import { TokenDiscoveryManager } from "../../token-discovery/TokenDiscoveryManager";

export class TokenDiscoveryController {
  public static getStatus(req: Request, res: Response): void {
    const status = TokenDiscoveryManager.getInstance().getStatus();
    res.json({
      message: "Token discovery status",
      running: status.isRunning,
      statistics: status.statistics,
    });
  }

  public static startService(req: Request, res: Response): void {
    TokenDiscoveryManager.getInstance().start();
    res.json({
      success: true,
      message: "Token discovery service started",
    });
  }

  public static stopService(req: Request, res: Response): void {
    TokenDiscoveryManager.getInstance().stop();
    res.json({
      success: true,
      message: "Token discovery service stopped",
    });
  }
}
