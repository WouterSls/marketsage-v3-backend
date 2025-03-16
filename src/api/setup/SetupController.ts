import { Request, Response } from "express";
import { asyncHandler } from "../../lib/middlewares";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";

import { SetupManager } from "../../setup/SetupManager";

export class SetupController {
  public static getWalletInfo = asyncHandler(async (req: Request, res: Response) => {
    try {
      const walletInfo = await SetupManager.getInstance().getWalletInfo();

      res.json({
        message: "Wallet info",
        walletInfo,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        throw new BadRequestError(errorMessage);
      } else {
        throw new InternalServerError("An unknown error occurred");
      }
    }
  });

  public static setupWallet = asyncHandler(async (req: Request, res: Response) => {
    throw new InternalServerError("Not implemented");
  });
}
