import { Request, Response } from "express";
import { TokenSecurityValidator } from "../../token-security-validator/TokenSecurityValidator";
import { LiquidityMapper } from "./dtos/LiquidityMapper";
import { AllProtocolsLiquidity } from "../../token-security-validator/models/liquidity.types";
import { LiquidityDto } from "./dtos/LiquidityDto";

export class TokenSecurityValidatorController {
  public static getStatus(req: Request, res: Response): void {
    const status = TokenSecurityValidator.getInstance().getStatus();

    res.json({
      message: "Token security validator status",
      statistics: status.statistics,
    });
  }

  public static async addNewToken(req: Request, res: Response): Promise<void> {
    const token: { address: string; creatorAddress: string } = req.body;

    try {
      const activeToken = await TokenSecurityValidator.getInstance().addNewToken(token);

      res.json({
        message: "New token added",
        activeToken,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error adding new token",
        error: (error as Error).message,
      });
    }
  }

  public static async getLiquidity(req: Request, res: Response): Promise<void> {
    const tokenAddress = req.query.tokenAddress as string;

    if (!tokenAddress) {
      res.status(400).json({
        message: "Token address is required",
      });
      return;
    }

    try {
      const liquidity: AllProtocolsLiquidity = await TokenSecurityValidator.getInstance()
        .getLiquidityCheckingService()
        .getLiquidity(tokenAddress);

      const liquidityDto: LiquidityDto = LiquidityMapper.toLiquidityDto(liquidity);

      res.json({
        message: "Liquidity check result",
        liquidity: liquidityDto,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error checking liquidity",
        error: (error as Error).message,
      });
    }
  }
}
