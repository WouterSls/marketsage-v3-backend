import { Request, Response } from "express";
import { TokenMonitorManager } from "../../token-monitor/TokenMonitorManager";

export class TokenMonitorController {
  public static getStatus(req: Request, res: Response): void {
    const status = TokenMonitorManager.getInstance().getStatus();
    res.json({
      message: "Token monitor status",
      statistics: status.statistics,
    });
  }

  public static async getAllPositions(req: Request, res: Response): Promise<void> {
    const positions = await TokenMonitorManager.getInstance().getAllPositions();
    res.json({
      message: "All positions",
      positions: positions,
    });
  }
  public static async getActivePositions(req: Request, res: Response): Promise<void> {
    const positions = await TokenMonitorManager.getInstance().getActivePositions();
    res.json({
      message: "Active positions",
      positions: positions,
    });
  }

  public static async getAllTokens(req: Request, res: Response): Promise<void> {
    const tokens = await TokenMonitorManager.getInstance().getAllTokens();
    res.json({
      message: "All tokens",
      tokens: tokens,
    });
  }

  public static async getAllTrades(req: Request, res: Response): Promise<void> {
    const trades = await TokenMonitorManager.getInstance().getAllTrades();
    res.json({
      message: "All trades",
      trades: trades,
    });
  }
}
