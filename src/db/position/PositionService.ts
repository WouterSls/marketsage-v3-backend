import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../lib/db/schema";
import { TechnicalError } from "../../lib/errors/TechnicalError";
import { TradeSuccessInfo } from "../../lib/blockchain/models/types/trading.types";
import { PositionRepository, SelectPosition } from "./PositionRepository";

/**
 * Service class for handling token position business logic
 * Manages the tracking of token positions, including buy/sell trades and profit/loss calculations
 */
export class PositionService {
  private repository: PositionRepository;

  /**
   * Creates a new TokenPositionService instance
   * @param database - Optional database instance for testing/dependency injection
   */
  constructor(database?: BetterSQLite3Database<typeof schema>) {
    this.repository = PositionRepository.getInstance(database);
  }

  /**
   * Gets all positions
   * @returns Promise resolving to an array of all token positions
   * @throws TechnicalError if the operation fails
   */
  async getAllPositions(): Promise<SelectPosition[]> {
    try {
      return await this.repository.getAllPositions();
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to get all positions: ${error}`);
    }
  }

  /**
   * Gets all active positions (positions with remaining tokens)
   * @returns Promise resolving to an array of active token positions
   * @throws TechnicalError if the operation fails
   */
  async getActivePositions(): Promise<SelectPosition[]> {
    try {
      return await this.repository.getActivePositions();
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to get active positions: ${error}`);
    }
  }

  /**
   * Gets the current position for a token
   * @param tokenAddress - The address of the token
   * @returns Promise resolving to the token position data or null if not found
   * @throws TechnicalError if the operation fails
   */
  async getPosition(tokenAddress: string): Promise<SelectPosition | null> {
    try {
      return await this.repository.getPositionByTokenAddress(tokenAddress);
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to get position: ${error}`);
    }
  }

  /**
   * Updates position data when a buy trade occurs
   * Calculates and updates various metrics including:
   * - Total tokens bought and remaining
   * - Total ETH and USD spent
   * - Gas costs
   * - Average entry price
   * - Current profit/loss
   *
   * @param tokenAddress - The address of the token being bought
   * @param tokenName - The name of the token
   * @param tradeInfo - Information about the successful trade
   * @returns Promise resolving to the updated position data
   * @throws TechnicalError if the update fails or if input validation fails
   */
  async updatePositionOnBuy(
    tokenAddress: string,
    tokenName: string,
    tradeInfo: TradeSuccessInfo,
  ): Promise<SelectPosition> {
    try {
      if (!tokenAddress || tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      if (!tokenName || tokenName.trim().length === 0) {
        throw new TechnicalError("Token name is required");
      }

      if (!tradeInfo.transactionHash) {
        throw new TechnicalError("Trade transaction hash is required");
      }

      const position = await this.getOrCreatePosition(tokenAddress, tokenName);

      const rawTokensReceived = Number(tradeInfo.rawTokensReceived);
      const formattedTokensReceived = Number(tradeInfo.formattedTokensReceived);
      const ethSpent = Number(tradeInfo.ethSpent);
      const gasCostEth = Number(tradeInfo.gasCost);
      const gasCostUsd = Number(tradeInfo.gasCost) * Number(tradeInfo.ethPriceUsd);
      const usdSpent = Number(ethSpent) * Number(tradeInfo.ethPriceUsd);

      const newRawTotalTokensBought = Number(position.rawTotalTokensBought || 0) + rawTokensReceived;
      const newFormattedTotalTokensBought = Number(position.formattedTotalTokensBought || 0) + formattedTokensReceived;
      const newTotalEthSpent = Number(position.totalEthSpent || 0) + ethSpent;
      const newTotalUsdSpent = Number(position.totalUsdSpent || 0) + usdSpent;
      const newTotalGasCostEth = Number(position.totalGasCostEth || 0) + gasCostEth;
      const newTotalGasCostUsd = Number(position.totalGasCostUsd || 0) + gasCostUsd;
      const newRawRemainingTokens = Number(position.rawRemainingTokens || 0) + rawTokensReceived;
      const newFormattedRemainingTokens = Number(position.formattedRemainingTokens || 0) + formattedTokensReceived;

      const newAverageEntryPriceUsd = newTotalUsdSpent / newFormattedTotalTokensBought;

      const currentValue = newFormattedRemainingTokens * Number(tradeInfo.tokenPriceUsd);
      const totalCost = newTotalUsdSpent + newTotalGasCostUsd;
      const currentProfitLossUsd = currentValue - totalCost;

      const nowUnix = Math.floor(Date.now() / 1000);
      const updates = {
        rawTotalTokensBought: newRawTotalTokensBought.toString(),
        formattedTotalTokensBought: newFormattedTotalTokensBought.toString(),
        totalEthSpent: newTotalEthSpent.toString(),
        totalUsdSpent: newTotalUsdSpent.toString(),
        totalGasCostEth: newTotalGasCostEth.toString(),
        totalGasCostUsd: newTotalGasCostUsd.toString(),
        rawRemainingTokens: newRawRemainingTokens.toString(),
        formattedRemainingTokens: newFormattedRemainingTokens.toString(),
        averageEntryPriceUsd: newAverageEntryPriceUsd.toString(),
        currentProfitLossUsd: currentProfitLossUsd.toString(),
        lastTradeAt: nowUnix,
        updatedAt: nowUnix,
      };

      return await this.repository.updatePosition(tokenAddress, updates);
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to update position on buy: ${error}`);
    }
  }

  /**
   * Updates position data when a sell trade occurs
   * Calculates and updates various metrics including:
   * - Total tokens sold and remaining
   * - Total ETH and USD received
   * - Gas costs
   * - Average exit price
   * - Realized and unrealized profit/loss
   *
   * @param tokenAddress - The address of the token being sold
   * @param tokenName - The name of the token
   * @param tradeInfo - Information about the successful trade
   * @returns Promise resolving to the updated position data
   * @throws TechnicalError if the update fails or if input validation fails
   */
  async updatePositionOnSell(
    tokenAddress: string,
    tokenName: string,
    tradeInfo: TradeSuccessInfo,
  ): Promise<SelectPosition> {
    try {
      if (!tokenAddress || tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      if (!tokenName || tokenName.trim().length === 0) {
        throw new TechnicalError("Token name is required");
      }

      if (!tradeInfo.transactionHash) {
        throw new TechnicalError("Trade transaction hash is required");
      }

      const position = await this.getOrCreatePosition(tokenAddress, tokenName);

      // Convert trade info to numbers for calculations
      const rawTokensSold = tradeInfo.rawTokensSpent || "0";
      const formattedTokensSold = tradeInfo.formattedTokensSpent || "0";
      const ethReceived = tradeInfo.ethReceived || "0";
      const gasCostEth = tradeInfo.gasCost;
      const gasCostUsd = Number(gasCostEth) * Number(tradeInfo.ethPriceUsd);
      const usdReceived = Number(ethReceived) * Number(tradeInfo.ethPriceUsd);

      // Calculate new totals
      const newRawTotalTokensSold = (BigInt(position.rawTotalTokensSold) + BigInt(rawTokensSold)).toString();
      const newFormattedTotalTokensSold = (
        Number(position.formattedTotalTokensSold) + Number(formattedTokensSold)
      ).toString();
      const newTotalEthReceived = (Number(position.totalEthReceived) + Number(ethReceived)).toString();
      const newTotalUsdReceived = (Number(position.totalUsdReceived) + usdReceived).toString();
      const newTotalGasCostEth = (Number(position.totalGasCostEth) + Number(gasCostEth)).toString();
      const newTotalGasCostUsd = (Number(position.totalGasCostUsd) + gasCostUsd).toString();
      const newRawRemainingTokens = (BigInt(position.rawRemainingTokens) - BigInt(rawTokensSold)).toString();
      const newFormattedRemainingTokens = (
        Number(position.formattedRemainingTokens) - Number(formattedTokensSold)
      ).toString();

      // Calculate new average exit price (only for the tokens that were sold)
      const newAverageExitPriceUsd =
        Number(newFormattedTotalTokensSold) > 0
          ? (Number(newTotalUsdReceived) / Number(newFormattedTotalTokensSold)).toString()
          : "0";

      // Calculate current P/L
      const currentValue = Number(newFormattedRemainingTokens) * Number(tradeInfo.tokenPriceUsd);
      const totalCost = Number(position.totalUsdSpent) + Number(newTotalGasCostUsd);

      // Calculate realized P/L based on the portion of tokens sold
      const soldPortionRatio = Number(formattedTokensSold) / Number(position.formattedTotalTokensBought);
      const costBasisForSoldPortion = Number(position.totalUsdSpent) * soldPortionRatio;
      const realizedPnL = usdReceived - costBasisForSoldPortion;

      // Total P/L includes both realized gains from this sale and unrealized gains from remaining position
      const currentProfitLossUsd = (currentValue + realizedPnL - totalCost).toString();

      const nowUnix = Math.floor(Date.now() / 1000);
      const updates = {
        rawTotalTokensSold: newRawTotalTokensSold,
        formattedTotalTokensSold: newFormattedTotalTokensSold,
        totalEthReceived: newTotalEthReceived,
        totalUsdReceived: newTotalUsdReceived,
        totalGasCostEth: newTotalGasCostEth,
        totalGasCostUsd: newTotalGasCostUsd,
        rawRemainingTokens: newRawRemainingTokens,
        formattedRemainingTokens: newFormattedRemainingTokens,
        averageExitPriceUsd: newAverageExitPriceUsd,
        currentProfitLossUsd: currentProfitLossUsd,
        lastTradeAt: nowUnix,
        updatedAt: nowUnix,
      };

      return await this.repository.updatePosition(tokenAddress, updates);
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to update position on sell: ${error}`);
    }
  }

  /**
   * Gets or creates a position for a token
   * @param tokenAddress - The address of the token
   * @param tokenName - The name of the token
   * @returns Promise resolving to the token position data
   * @throws TechnicalError if the operation fails
   */
  private async getOrCreatePosition(tokenAddress: string, tokenName: string): Promise<SelectPosition> {
    try {
      const existing = await this.repository.getPositionByTokenAddress(tokenAddress);

      if (existing) {
        return existing;
      }

      const nowUnix = Math.floor(Date.now() / 1000);
      return await this.repository.createPosition({
        tokenAddress,
        tokenName,
        createdAt: nowUnix,
        updatedAt: nowUnix,
        lastTradeAt: nowUnix,
      });
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to get or create position: ${error}`);
    }
  }
}
