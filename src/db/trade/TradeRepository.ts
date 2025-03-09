import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, desc, inArray, and } from "drizzle-orm";

import { db } from "../../lib/db/db";
import * as schema from "../../lib/db/schema";
import { trade, TradeStatus, TradeType } from "../../lib/db/schema";

import { TechnicalError } from "../../lib/errors/TechnicalError";
import { splitTokenAddress } from "../../lib/utils/helper-functions";

export type SelectTrade = typeof trade.$inferSelect;
export type InsertTrade = typeof trade.$inferInsert;

/**
 * Repository class for handling trade-related database operations
 * Implements the Singleton pattern to ensure only one instance exists
 */
export class TradeRepository {
  private static instance: TradeRepository;
  private db: BetterSQLite3Database<typeof schema>;

  /**
   * Private constructor to prevent direct instantiation
   * @param database - Optional database instance for testing/dependency injection
   */
  private constructor(database: BetterSQLite3Database<typeof schema> = db) {
    this.db = database;
  }

  /**
   * Gets the singleton instance of TradeRepository
   * @param database - Optional database instance for testing/dependency injection
   * @returns The TradeRepository instance
   */
  public static getInstance(database?: BetterSQLite3Database<typeof schema>): TradeRepository {
    if (!TradeRepository.instance || database) {
      TradeRepository.instance = new TradeRepository(database);
    }
    return TradeRepository.instance;
  }

  /**
   * Retrieves all trades from the database
   * @returns Promise resolving to an array of all trades
   * @throws TechnicalError if database operation fails
   */
  async getAllTrades(): Promise<SelectTrade[]> {
    try {
      return await this.db.select().from(trade).orderBy(desc(trade.createdAt));
    } catch (error: unknown) {
      console.error("Error getting all trades", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves a specific trade by its ID
   * @param id - The trade's ID
   * @returns Promise resolving to the trade data
   * @throws TechnicalError if trade is not found or if multiple trades are found
   */
  async getTradeById(id: number): Promise<SelectTrade> {
    try {
      const result = await this.db.select().from(trade).where(eq(trade.id, id));

      if (result.length === 0) {
        throw new TechnicalError("Trade not found");
      }

      if (result.length > 1) {
        throw new TechnicalError("Multiple trades found for id: " + id);
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error getting trade", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all trades for a specific token
   * @param tokenAddress - The token's address
   * @returns Promise resolving to an array of trades for the token
   * @throws TechnicalError if database operation fails
   */
  async getTradesByTokenAddress(tokenAddress: string): Promise<SelectTrade[]> {
    try {
      return await this.db
        .select()
        .from(trade)
        .where(eq(trade.tokenAddress, tokenAddress))
        .orderBy(desc(trade.createdAt));
    } catch (error: unknown) {
      console.error(`Error getting trades for token: ${splitTokenAddress(tokenAddress)}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all trades of a specific status
   * @param tradeStatus - The status of trades to retrieve (buy, sell)
   * @returns Promise resolving to an array of trades of the specified status
   * @throws TechnicalError if database operation fails
   */
  async getTradesByStatus(tradeStatus: TradeStatus): Promise<SelectTrade[]> {
    try {
      return await this.db.select().from(trade).where(eq(trade.status, tradeStatus)).orderBy(desc(trade.createdAt));
    } catch (error: unknown) {
      console.error(`Error getting trades for status: ${tradeStatus}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all trades of a specific type
   * @param tradeType - The type of trades to retrieve (earlyExit, doubleExit, usdValue, partialSell, fullSell)
   * @returns Promise resolving to an array of trades of the specified type
   * @throws TechnicalError if database operation fails
   */
  async getTradesByType(tradeType: TradeType): Promise<SelectTrade[]> {
    try {
      return await this.db.select().from(trade).where(eq(trade.type, tradeType)).orderBy(desc(trade.createdAt));
    } catch (error: unknown) {
      console.error(`Error getting trades for type: ${tradeType}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all buy trades linked to a token that are not sold
   * @param tokenAddress - The token's address
   * @param tradeTypes - The types of trades to retrieve
   * @returns Promise resolving to an array of buy trades of the specified type
   * @throws TechnicalError if database operation fails
   */
  async getTradesForTokenWithType(tokenAddress: string, tradeTypes: TradeType[]): Promise<SelectTrade[]> {
    try {
      return await this.db
        .select()
        .from(trade)
        .where(and(eq(trade.tokenAddress, tokenAddress), inArray(trade.type, tradeTypes)))
        .orderBy(desc(trade.createdAt));
    } catch (error: unknown) {
      console.error(`Error getting buy trades for token: ${splitTokenAddress(tokenAddress)}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Creates a new trade in the database
   * @param newTrade - The trade data to insert
   * @returns Promise resolving to the created trade
   * @throws TechnicalError if insertion fails or no data is returned
   */
  async createTrade(newTrade: InsertTrade): Promise<SelectTrade> {
    try {
      const result = await this.db.insert(trade).values(newTrade).returning();

      if (result.length === 0) {
        throw new TechnicalError("No data returned after inserting trade");
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error saving trade", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }
}
