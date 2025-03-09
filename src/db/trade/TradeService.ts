import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "../../lib/db/schema";
import { TradeStatus, TradeType } from "../../lib/db/schema";

import { TradeRepository, SelectTrade, InsertTrade } from "./TradeRepository";
import { TechnicalError } from "../../lib/errors/TechnicalError";
import { TradeSuccessInfo } from "../../lib/blockchain/models/types/trading.types";

/**
 * Service class for handling trade-related business logic
 */
export class TradeService {
  private repository: TradeRepository;

  /**
   * Creates a new TradeService instance
   * @param database - Optional database instance for testing/dependency injection
   */
  constructor(database?: BetterSQLite3Database<typeof schema>) {
    this.repository = TradeRepository.getInstance(database);
  }

  /**
   * Retrieves all trades from the database
   * @returns Promise resolving to an array of all trades
   */
  async getAllTrades(): Promise<SelectTrade[]> {
    return this.repository.getAllTrades();
  }

  /**
   * Retrieves a specific trade by its ID
   * @param id - The trade's ID
   * @returns Promise resolving to the trade data
   */
  async getTradeById(id: number): Promise<SelectTrade> {
    return this.repository.getTradeById(id);
  }

  /**
   * Retrieves all trades for a specific token
   * @param tokenAddress - The token's address
   * @returns Promise resolving to an array of trades for the token
   */
  async getTradesByTokenAddress(tokenAddress: string): Promise<SelectTrade[]> {
    return this.repository.getTradesByTokenAddress(tokenAddress);
  }

  /**
   * Retrieves all trades of a specific type
   * @param tradeType - The type of trades to retrieve
   * @returns Promise resolving to an array of trades of the specified type
   */
  async getTradesByType(tradeType: TradeType): Promise<SelectTrade[]> {
    return this.repository.getTradesByType(tradeType);
  }
  /**
   * Retrieves all buy trades linked to a token that are not sold
   * @param tokenAddress - The token's address
   * @returns Promise resolving to an array of buy trades of the specified type
   * @throws TechnicalError if database operation fails
   */
  async getBuyTradesForToken(tokenAddress: string): Promise<SelectTrade[]> {
    const buyTypes: TradeType[] = ["usdValue", "doubleExit", "earlyExit"];
    return this.repository.getTradesForTokenWithType(tokenAddress, buyTypes);
  }

  /**
   * Creates a new buy trade in the database
   * @param tokenAddress - The address of the token being traded
   * @param tokenName - The name of the token being traded
   * @param buyType - The type of buy trade (usdValue, doubleExit, earlyExit)
   * @param dex - The DEX used for the trade
   * @param tradeInfo - Information about the successful trade
   * @returns Promise resolving to the created trade
   * @throws TechnicalError if trade creation fails
   */
  async createTrade(
    tokenAddress: string,
    tokenName: string,
    status: TradeStatus,
    type: TradeType,
    tradeInfo: TradeSuccessInfo,
  ): Promise<SelectTrade> {
    try {
      if (tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      if (status !== "buy" && status !== "sell") {
        throw new TechnicalError("Invalid trade status");
      }

      const validBuyTypes = ["usdValue", "doubleExit", "earlyExit"];
      const validSellTypes = ["partialSell", "fullSell"];

      if (status === "buy" && !validBuyTypes.includes(type)) {
        throw new TechnicalError("Invalid buy type");
      }

      if (status === "sell" && !validSellTypes.includes(type)) {
        throw new TechnicalError("Invalid sell type");
      }

      const nowUnix = Math.floor(Date.now() / 1000);
      const tradeData: InsertTrade = {
        tokenAddress,
        tokenName,
        transactionHash: tradeInfo.transactionHash,
        status: status,
        type: type,
        tokenPriceUsd: tradeInfo.tokenPriceUsd,
        ethPriceUsd: tradeInfo.ethPriceUsd,
        gasCostEth: tradeInfo.gasCost,
        gasCostUsd: (Number(tradeInfo.gasCost) * Number(tradeInfo.ethPriceUsd || 0)).toString(),
        createdAt: nowUnix,
      };

      if (status === "buy") {
        tradeData.ethSpent = tradeInfo.ethSpent?.toString();
        tradeData.rawBuyAmount = Number(tradeInfo.rawTokensReceived)?.toString();
        tradeData.formattedBuyAmount = tradeInfo.formattedTokensReceived;
      } else {
        tradeData.ethReceived = tradeInfo.ethReceived?.toString();
        tradeData.rawSellAmount = tradeInfo.rawTokensSpent?.toString();
        tradeData.formattedSellAmount = tradeInfo.formattedTokensSpent;
      }

      return await this.repository.createTrade(tradeData);
    } catch (error) {
      console.error("Error creating trade:", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError("Failed to create trade");
    }
  }
}
