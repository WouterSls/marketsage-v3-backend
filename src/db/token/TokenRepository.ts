import { db } from "../../lib/db/db";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, inArray } from "drizzle-orm";

import * as schema from "../../lib/db/schema";
import { token, TokenStatus } from "../../lib/db/schema";

import { splitTokenAddress } from "../../lib/utils/helper-functions";

import { TechnicalError } from "../../lib/errors/TechnicalError";

export type SelectToken = typeof token.$inferSelect;
export type InsertToken = typeof token.$inferInsert;

/**
 * Repository class for handling token-related database operations
 * Implements the Singleton pattern to ensure only one instance exists
 */
export class TokenRepository {
  private static instance: TokenRepository;
  private db: BetterSQLite3Database<typeof schema>;

  /**
   * Private constructor to prevent direct instantiation
   * @param database - Optional database instance for testing/dependency injection
   */
  private constructor(database: BetterSQLite3Database<typeof schema> = db) {
    this.db = database;
  }

  /**
   * Gets the singleton instance of TokenRepository
   * @param database - Optional database instance for testing/dependency injection
   * @returns The TokenRepository instance
   */
  public static getInstance(database?: BetterSQLite3Database<typeof schema>): TokenRepository {
    if (!TokenRepository.instance || database) {
      TokenRepository.instance = new TokenRepository(database);
    }
    return TokenRepository.instance;
  }

  /**
   * Retrieves all tokens from the database
   * @returns Promise resolving to an array of all tokens
   * @throws TechnicalError if database operation fails
   */
  async getAllTokens(): Promise<SelectToken[]> {
    try {
      return await this.db.select().from(token);
    } catch (error: unknown) {
      console.error("Error getting all tokens", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves a specific token by its address
   * @param address - The token's address
   * @returns Promise resolving to the token data
   * @throws TechnicalError if token is not found or if multiple tokens are found
   */
  async getTokenByAddress(address: string): Promise<SelectToken | null> {
    try {
      const result = await this.db.select().from(token).where(eq(token.address, address));

      if (result.length === 0) {
        return null;
      }

      if (result.length > 1) {
        throw new TechnicalError("Multiple tokens found for address: " + splitTokenAddress(address));
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error getting token", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all tokens with a specific status
   * @param status - The TokenStatus to filter by
   * @returns Promise resolving to an array of tokens with the specified status
   * @throws TechnicalError if database operation fails
   */
  async getTokensByStatus(status: TokenStatus): Promise<SelectToken[]> {
    try {
      return await this.db.select().from(token).where(eq(token.status, status));
    } catch (error: unknown) {
      console.error(`Error getting tokens for status: ${status}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Retrieves all tokens matching any of the provided statuses
   * @param statuses - Array of token statuses to filter by
   * @returns Promise resolving to an array of tokens matching any of the provided statuses
   * @throws TechnicalError if database operation fails
   */
  async getTokensByStatuses(statuses: TokenStatus[]): Promise<SelectToken[]> {
    try {
      return await this.db.select().from(token).where(inArray(token.status, statuses));
    } catch (error: unknown) {
      console.error(`Error getting tokens for statuses: ${statuses.join(", ")}`, error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Creates a new token in the database
   * @param newToken - The token data to insert
   * @returns Promise resolving to the created token
   * @throws TechnicalError if insertion fails or no data is returned
   */
  async createToken(newToken: InsertToken): Promise<SelectToken> {
    try {
      const insertCheck = await this.db.select().from(token).where(eq(token.address, newToken.address));

      if (insertCheck.length > 0) {
        throw new TechnicalError("Token address already exists");
      }

      const result = await this.db.insert(token).values(newToken).returning();

      if (result.length === 0) {
        throw new TechnicalError("No data returned after inserting token");
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error saving token", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }

  /**
   * Updates an existing token in the database
   * @param tokenToUpdate - Partial token data with required address field
   * @returns Promise resolving to the updated token
   * @throws TechnicalError if token is not found or update fails
   */
  async updateToken(tokenToUpdate: Partial<SelectToken> & { address: string }): Promise<SelectToken> {
    try {
      const result = await this.db
        .update(token)
        .set({
          ...tokenToUpdate,
        })
        .where(eq(token.address, tokenToUpdate.address))
        .returning();

      if (result.length === 0) {
        throw new TechnicalError(`Token not found with address: ${tokenToUpdate.address}`);
      }

      return result[0];
    } catch (error: unknown) {
      console.error("Error updating token", error);
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(errorMessage);
    }
  }
}
