import { Request, Response } from "express";
import { TokenDiscoveryManager } from "../../token-discovery/TokenDiscoveryManager";
import { asyncHandler } from "../../lib/middlewares";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";

export class TokenDiscoveryController {
  public static getStatus(req: Request, res: Response): void {
    try {
      const isRunning: boolean = TokenDiscoveryManager.getInstance().getStatus();

      res.json({
        message: "Token discovery status",
        running: isRunning,
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

  public static startService = asyncHandler(async (req: Request, res: Response) => {
    try {
      await TokenDiscoveryManager.getInstance().start();
      res.json({
        success: true,
        message: "Token discovery service started",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new BadRequestError(errorMessage);
    }
  });

  public static stopService = asyncHandler(async (req: Request, res: Response) => {
    try {
      TokenDiscoveryManager.getInstance().stop();
      res.json({
        success: true,
        message: "Token discovery service stopped",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new BadRequestError(errorMessage);
    }
  });

  public static retryVerification = asyncHandler(async (req: Request, res: Response) => {
    try {
      TokenDiscoveryManager.getInstance().retryVerification();
      res.json({
        success: true,
        message: "Token verification retry started",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new BadRequestError(errorMessage);
    }
  });
}
