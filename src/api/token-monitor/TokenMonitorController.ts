import { Request, Response } from "express";
import { asyncHandler } from "../../lib/middlewares";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";

import { TokenMonitorManager } from "../../token-monitor/TokenMonitorManager";

import { PositionMapper, PositionDto, TokenDto, TokenMapper, TradeDto, TradeMapper } from "./index";

import { SelectPosition, SelectToken, SelectTrade } from "../../db/index";
import { TokenStatus } from "../../lib/db/schema";

export class TokenMonitorController {
  public static getTokenByAddress = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      const token: SelectToken | null = await TokenMonitorManager.getInstance()
        .getTokenService()
        .getTokenByAddress(address);
      if (!token) throw new BadRequestError("Token not found");
      const tokenDto = TokenMapper.toTokenDto(token);
      res.json({
        message: "Token",
        token: tokenDto,
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
  public static async getAllPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions: SelectPosition[] = await TokenMonitorManager.getInstance()
        .getPositionService()
        .getAllPositions();
      const positionsDto: PositionDto[] = positions.map((position) => PositionMapper.toPositionDto(position));
      res.json({
        message: "All positions",
        positions: positionsDto,
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
  public static async getActivePositions(req: Request, res: Response): Promise<void> {
    try {
      const positions: SelectPosition[] = await TokenMonitorManager.getInstance()
        .getPositionService()
        .getActivePositions();
      const positionsDto: PositionDto[] = positions.map((position) => PositionMapper.toPositionDto(position));

      res.json({
        message: "Active positions",
        positions: positionsDto,
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

  public static async getAllTokens(req: Request, res: Response): Promise<void> {
    try {
      const tokens: SelectToken[] = await TokenMonitorManager.getInstance().getTokenService().getAllTokens();
      const tokensDto: TokenDto[] = tokens.map((token) => TokenMapper.toTokenDto(token));
      res.json({
        message: "All tokens",
        tokens: tokensDto,
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
  public static async getBuyableTokens(req: Request, res: Response): Promise<void> {
    try {
      const buyableStatuses: TokenStatus[] = ["buyable", "sold", "validated"];
      const tokens: SelectToken[] = await TokenMonitorManager.getInstance()
        .getTokenService()
        .getTokensByStatuses(buyableStatuses);

      const tokensDto: TokenDto[] = tokens.map((token) => TokenMapper.toTokenDto(token));
      res.json({
        message: "Buyable tokens",
        tokens: tokensDto,
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

  public static buyToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { tokenAddress, tradeType, usdAmount } = req.body;
      const token = await TokenMonitorManager.getInstance().getTokenService().getTokenByAddress(tokenAddress);
      if (!token) {
        throw new BadRequestError("Token not found");
      }
      TokenMonitorManager.getInstance().buyToken(tokenAddress, tradeType, usdAmount);
      if (token.status === "buyable") {
        res.json({
          message: "Checking for honeypot & creating buy transaction...",
        });
      } else {
        res.json({
          message: "Creating buy transaction...",
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        throw new InternalServerError(errorMessage);
      } else {
        throw new InternalServerError("An unknown error occurred");
      }
    }
  });
  public static async sellToken(req: Request, res: Response): Promise<void> {
    try {
      const { tokenAddress, formattedAmount } = req.body;
      await TokenMonitorManager.getInstance().sellToken(tokenAddress, formattedAmount);
      res.json({
        message: "Token sold",
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
  public static monitorToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { tokenAddress } = req.body;
      await TokenMonitorManager.getInstance().monitorToken(tokenAddress);
      res.json({
        message: "Token monitored",
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

  public static archiveToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { tokenAddress, reason } = req.body;
      await TokenMonitorManager.getInstance().archiveToken(tokenAddress, reason);
      res.json({
        message: "Token archived",
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
  public static async getAllTrades(req: Request, res: Response): Promise<void> {
    try {
      const trades: SelectTrade[] = await TokenMonitorManager.getInstance().getTradeService().getAllTrades();
      const tradesDto: TradeDto[] = trades.map((trade) => TradeMapper.toTradeDto(trade));
      res.json({
        message: "All trades",
        trades: tradesDto,
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
