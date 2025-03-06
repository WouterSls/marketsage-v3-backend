import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";

import { db } from "../../lib/db/db";
import * as schema from "../../lib/db/schema";
import { trade } from "../../lib/db/schema";

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
   * Retrieves all trades of a specific type
   * @param tradeType - The type of trades to retrieve (buy, sell, stoploss)
   * @returns Promise resolving to an array of trades of the specified type
   * @throws TechnicalError if database operation fails
   */
  async getTradesByType(tradeType: "buy" | "sell" | "stoploss"): Promise<SelectTrade[]> {
    try {
      return await this.db.select().from(trade).where(eq(trade.tradeType, tradeType)).orderBy(desc(trade.createdAt));
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

  /**
   * Updates an existing trade in the database
   * @param id - The ID of the trade to update
   * @param updates - Partial trade data to update (excluding id and timestamps)
   * @returns Promise resolving to the updated trade
   * @throws TechnicalError if trade is not found or update fails
   */
  async updateTrade(id: number, updates: Partial<Omit<SelectTrade, "id" | "createdAt">>): Promise<SelectTrade> {
    try {
      const result = await this.db
        .update(trade)
        .set({
          ...updates,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(trade.id, id))
        .returning();

      if (result.length === 0) {
        throw new TechnicalError(`Trade not found with id: ${id}`);
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error updating trade", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }
}
