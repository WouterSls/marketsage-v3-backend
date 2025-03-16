import { Request, Response } from "express";
import { asyncHandler } from "../../lib/middlewares";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";

import { TokenMonitorManager } from "../../token-monitor/TokenMonitorManager";

import { PositionMapper, PositionDto, TokenDto, TokenMapper, TradeDto, TradeMapper } from "./index";

import { SelectPosition, SelectToken, SelectTrade } from "../../db/index";

export class TokenMonitorController {
  public static async getAllPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions: SelectPosition[] = await TokenMonitorManager.getInstance().getAllPositions();
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
      const positions: SelectPosition[] = await TokenMonitorManager.getInstance().getActivePositions();
      const positionsDto: PositionDto[] = positions.map((position) => PositionMapper.toPositionDto(position));

      const TEST_POSITION: PositionDto = {
        tokenAddress: "0x1234567890123456789012345678901234567890",
        tokenName: "Test Token",
        averageEntryPriceUsd: "0.4",
        averageExitPriceUsd: "0.5",
        currentProfitLossUsd: "270",
      };
      positionsDto.push(TEST_POSITION);

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
      const tokens: SelectToken[] = await TokenMonitorManager.getInstance().getAllTokens();
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

  public static async getAllTrades(req: Request, res: Response): Promise<void> {
    try {
      const trades: SelectTrade[] = await TokenMonitorManager.getInstance().getAllTrades();
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

  public static async buyToken(req: Request, res: Response): Promise<void> {
    try {
      const { tokenAddress, tradeType, usdAmount } = req.body;
      await TokenMonitorManager.getInstance().buyToken(tokenAddress, tradeType, usdAmount);
      res.json({
        message: "Token bought",
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
}
