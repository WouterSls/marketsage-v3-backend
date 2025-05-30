import { Request, Response } from "express";
import { asyncHandler } from "../../lib/middlewares";
import { BadRequestError, InternalServerError } from "../../lib/errors/ApiError";

import { TokenData, TokenMonitorManager } from "../../token-monitor/TokenMonitorManager";

import { PositionMapper, PositionDto, TokenDto, TokenMapper, TradeDto, TradeMapper } from "./index";

import { SelectPosition, SelectToken, SelectTrade } from "../../db/index";
import { TokenStatus } from "../../lib/db/schema";

export class TokenMonitorController {
  public static getTokenByAddress = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();

      const token: SelectToken | null = await TokenMonitorManager.getInstance()
        .getTokenService()
        .getTokenByAddress(normalizedAddress);
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
  public static getTokenData = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      const tokenData = await TokenMonitorManager.getInstance().getTokenData(normalizedAddress);
      res.json({
        message: "Token data",
        tokenData: tokenData,
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

  public static getTokens = asyncHandler(async (req: Request, res: Response) => {
    try {
      let tokens: SelectToken[];

      let statusFilter: TokenStatus[] | undefined = undefined;
      if (req.query.status) {
        const rawStatuses = Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(",");
        statusFilter = rawStatuses.map((status) => status as TokenStatus);
      }

      if (statusFilter && statusFilter.length > 0) {
        tokens = await TokenMonitorManager.getInstance().getTokenService().getTokensByStatuses(statusFilter);
      } else {
        tokens = await TokenMonitorManager.getInstance().getTokenService().getAllTokens();
      }

      const tokensDto: TokenDto[] = tokens.map((token) => TokenMapper.toTokenDto(token));
      res.json({
        message: "Tokens",
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
  });
  public static getTokensData = asyncHandler(async (req: Request, res: Response) => {
    try {
      const activeStatuses: TokenStatus[] = ["buyable", "validated", "sold"];
      const tokens = await TokenMonitorManager.getInstance().getTokenService().getTokensByStatuses(activeStatuses);
      const tokensData: TokenData[] = [];
      for (const token of tokens) {
        const tokenData = await TokenMonitorManager.getInstance().getTokenData(token.address);
        tokensData.push(tokenData);
      }
      res.json({
        message: "Tokens data",
        tokensData: tokensData,
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

  public static getTokenPriceData = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();

      const token = await TokenMonitorManager.getInstance().getTokenService().getTokenByAddress(normalizedAddress);
      if (!token) {
        throw new BadRequestError("Controller: Token not found");
      }

      const { priceUsd, liquidity } = await TokenMonitorManager.getInstance().getTokenPriceData(normalizedAddress);
      const priceData = {
        priceUsd,
        liquidity,
      };

      res.json({
        message: "Token price data",
        priceData,
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
  public static deleteToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      await TokenMonitorManager.getInstance().getTokenService().deleteToken(normalizedAddress);
      res.json({
        message: "Token deleted",
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

  public static buyToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      const { tradeType, usdAmount } = req.body;
      //const { tokenAddress, tradeType, usdAmount } = req.body;
      const token = await TokenMonitorManager.getInstance().getTokenService().getTokenByAddress(normalizedAddress);
      if (!token) {
        throw new BadRequestError("Token not found");
      }
      TokenMonitorManager.getInstance().buyToken(normalizedAddress, tradeType, usdAmount);
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
  public static sellToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      const { formattedAmount } = req.body;
      await TokenMonitorManager.getInstance().sellToken(normalizedAddress, formattedAmount);
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
  });
  public static monitorToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      await TokenMonitorManager.getInstance().monitorToken(normalizedAddress);
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
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      const { reason } = req.body;
      await TokenMonitorManager.getInstance().archiveToken(normalizedAddress, reason);
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
  public static revalidateToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      await TokenMonitorManager.getInstance().revalidateToken(normalizedAddress);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        throw new BadRequestError(errorMessage);
      } else {
        throw new InternalServerError("An unknown error occurred");
      }
    }
  });

  public static getTrades = asyncHandler(async (req: Request, res: Response) => {
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
  });

  public static getPositions = asyncHandler(async (req: Request, res: Response) => {
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
  });
  public static getActivePositions = asyncHandler(async (req: Request, res: Response) => {
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
  });
  public static getPositionByTokenAddress = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const normalizedAddress = address.toLowerCase();
      const position: SelectPosition | null = await TokenMonitorManager.getInstance()
        .getPositionService()
        .getPosition(normalizedAddress);
      if (!position) {
        throw new BadRequestError("Position not found");
      }
      const positionDto: PositionDto = PositionMapper.toPositionDto(position);
      res.json({
        message: "Position",
        position: positionDto,
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
