import { db } from "../../lib/db/db";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../lib/db/schema";
import { position } from "../../lib/db/schema";

import { TechnicalError } from "../../lib/errors/TechnicalError";

export type SelectPosition = typeof position.$inferSelect;
export type InsertPosition = typeof position.$inferInsert;

/**
 * Repository class for handling token position database operations
 */
export class PositionRepository {
  private static instance: PositionRepository;
  private db: BetterSQLite3Database<typeof schema>;

  /**
   * Creates a new TokenPositionRepository instance
   * @param database - Optional database instance for testing/dependency injection
   */
  private constructor(database: BetterSQLite3Database<typeof schema> = db) {
    this.db = database;
  }

  /**
   * Gets the singleton instance of PositionRepository
   * @param database - Optional database instance for testing/dependency injection
   * @returns The PositionRepository instance
   * @throws TechnicalError if database instance is not provided on first instantiation
   */
  static getInstance(database?: BetterSQLite3Database<typeof schema>): PositionRepository {
    if (!PositionRepository.instance) {
      PositionRepository.instance = new PositionRepository(database);
    }
    return PositionRepository.instance;
  }

  /**
   * Retrieves a token position by its token address
   * @param tokenAddress - The address of the token
   * @returns Promise resolving to the token position data or null if not found
   * @throws TechnicalError if the database operation fails
   */
  async getPositionByTokenAddress(tokenAddress: string): Promise<SelectPosition | null> {
    try {
      if (!tokenAddress || tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      const [_position] = await this.db.select().from(position).where(eq(position.tokenAddress, tokenAddress));
      return _position || null;
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to get position: ${error}`);
    }
  }

  /**
   * Creates a new token position in the database
   * @param data - The token position data to insert
   * @returns Promise resolving to the created token position
   * @throws TechnicalError if the database operation fails or if the data is invalid
   */
  async createPosition(data: InsertPosition): Promise<SelectPosition> {
    try {
      if (!data.tokenAddress || data.tokenAddress.length !== 42 || !data.tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      if (!data.tokenName || data.tokenName.trim().length === 0) {
        throw new TechnicalError("Token name is required");
      }

      const existing = await this.getPositionByTokenAddress(data.tokenAddress);
      if (existing) {
        throw new TechnicalError(`Position already exists for token: ${data.tokenAddress}`);
      }

      const [created] = await this.db.insert(position).values(data).returning();
      return created;
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to create position: ${error}`);
    }
  }

  /**
   * Updates an existing token position in the database
   * @param tokenAddress - The address of the token to update
   * @param updates - Partial token position data to update
   * @returns Promise resolving to the updated token position
   * @throws TechnicalError if the database operation fails, token address is invalid, or position is not found
   */
  async updatePosition(tokenAddress: string, updates: Partial<SelectPosition>): Promise<SelectPosition> {
    try {
      if (!tokenAddress || tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid token address format");
      }

      const existing = await this.getPositionByTokenAddress(tokenAddress);
      if (!existing) {
        throw new TechnicalError(`Position not found for token: ${tokenAddress}`);
      }

      const [updated] = await this.db
        .update(position)
        .set(updates)
        .where(eq(position.tokenAddress, tokenAddress))
        .returning();

      if (!updated) {
        throw new TechnicalError(`Failed to update position for token: ${tokenAddress}`);
      }

      return updated;
    } catch (error) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      throw new TechnicalError(`Failed to update position: ${error}`);
    }
  }

  /**
   * Retrieves all token positions from the database
   * @returns Promise resolving to an array of all token positions
   * @throws TechnicalError if the database operation fails
   */
  async getAllPositions(): Promise<SelectPosition[]> {
    try {
      return await this.db.select().from(position);
    } catch (error) {
      throw new TechnicalError(`Failed to get all positions: ${error}`);
    }
  }

  /**
   * Retrieves all token positions with a positive remaining token balance
   * @returns Promise resolving to an array of active token positions
   * @throws TechnicalError if the database operation fails
   */
  async getActivePositions(): Promise<SelectPosition[]> {
    try {
      return await this.db
        .select()
        .from(position)
        .where(sql`CAST(${position.rawRemainingTokens} AS DECIMAL) > 0`);
    } catch (error) {
      throw new TechnicalError(`Failed to get active positions: ${error}`);
    }
  }
}
