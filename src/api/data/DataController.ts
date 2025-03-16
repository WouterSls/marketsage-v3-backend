import { Request, Response } from "express";
import { TokenDiscoveryManager } from "../../token-discovery/TokenDiscoveryManager";
import { TokenDiscoveryStatistics } from "../../token-discovery/models/token-discovery.types";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";
import { TokenMonitorManager } from "../../token-monitor/TokenMonitorManager";
import { TokenMonitorStatistics } from "../../token-monitor/models/token-monitor.types";
import { TokenSecurityValidator } from "../../token-security-validator/TokenSecurityValidator";
import { TokenSecurityValidatorStatistics } from "../../token-security-validator/models/token-security-validator.types";

export class DataController {
  public static getStatistics(req: Request, res: Response): void {
    try {
      const discoveryStats: TokenDiscoveryStatistics = TokenDiscoveryManager.getInstance().getStatistics();
      const validatorStats: TokenSecurityValidatorStatistics = TokenSecurityValidator.getInstance().getStatistics();
      const monitorStats: TokenMonitorStatistics = TokenMonitorManager.getInstance().getStatistics();

      res.json({
        message: "MarketSage statistics",
        data: {
          tokenDiscovery: discoveryStats,
          tokenMonitor: monitorStats,
          tokenSecurityValidator: validatorStats,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        throw new BadRequestError(errorMessage);
      } else {
        throw new InternalServerError("An unknown error occurred");
      }
    }
  }
}
