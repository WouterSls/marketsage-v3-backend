import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../lib/db/schema";

import { TokenRepository, SelectToken, InsertToken } from "./TokenRepository";
import { DexType, TokenStatus } from "../../lib/db/schema";

import { TechnicalError } from "../../lib/errors/TechnicalError";

/**
 * Service class for handling token-related business logic
 */
export class TokenService {
  private repository: TokenRepository;

  /**
   * Creates a new TokenService instance
   * @param database - Optional database instance for testing/dependency injection
   */
  constructor(database?: BetterSQLite3Database<typeof schema>) {
    this.repository = TokenRepository.getInstance(database);
  }

  /**
   * Retrieves all tokens from the database
   * @returns Promise resolving to an array of all tokens
   */
  async getAllTokens(): Promise<SelectToken[]> {
    return this.repository.getAllTokens();
  }

  /**
   * Retrieves all tokens with a specific status
   * @param status - The status of the tokens to retrieve
   * @returns Promise resolving to an array of tokens with the specified status
   */
  async getTokensByStatus(status: TokenStatus): Promise<SelectToken[]> {
    return this.repository.getTokensByStatus(status);
  }

  /**
   * Retrieves all tokens matching any of the provided statuses
   * @param statuses - Array of token statuses to filter by
   * @returns Promise resolving to an array of tokens matching any of the provided statuses
   */
  async getTokensByStatuses(statuses: TokenStatus[]): Promise<SelectToken[]> {
    if (!statuses.length) {
      return this.getAllTokens();
    }
    return this.repository.getTokensByStatuses(statuses);
  }

  /**
   * Retrieves a specific token by its address
   * @param address - The token's address
   * @returns Promise resolving to the token data
   */
  async getTokenByAddress(address: string): Promise<SelectToken | null> {
    return this.repository.getTokenByAddress(address);
  }

  /**
   * Creates a new token in the database
   * @param tokenName - The name of the token
   * @param tokenSymbol - The symbol of the token
   * @param tokenAddress - The address of the token
   * @param creatorAddress - The address of the creator of the token
   * @param discoveredAt - The timestamp when the token was discovered
   * @param status - The initial status of the token (validated, buyable, sold, rugpull, honeypot, archived)
   * @param dex - The dex of the token (uniswapv2, uniswapv3, uniswapv4, aerodrome, balancer)
   * @returns Promise resolving to the created token
   * @throws TechnicalError if token creation fails or business rules are violated
   */
  async createToken(
    tokenName: string,
    tokenSymbol: string,
    tokenAddress: string,
    creatorAddress: string,
    discoveredAt: number,
    status: TokenStatus,
    dex: DexType,
  ): Promise<SelectToken> {
    try {
      if (tokenAddress.length !== 42 || !tokenAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid Ethereum address format");
      }

      if (creatorAddress.length !== 42 || !creatorAddress.startsWith("0x")) {
        throw new TechnicalError("Invalid Ethereum address format");
      }

      const nowUnix = Date.now();

      const tokenInfo: InsertToken = {
        name: tokenName,
        symbol: tokenSymbol,
        address: tokenAddress,
        creatorAddress: creatorAddress,
        status: status,
        discoveredAt: discoveredAt,
        updatedAt: nowUnix,
        dex: dex,
      };

      return this.repository.createToken(tokenInfo);
    } catch (error: unknown) {
      if (error instanceof TechnicalError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TechnicalError(`Failed to create token: ${errorMessage}`);
    }
  }

  /**
   * Updates an existing token in the database
   * @param address - The address of the token to update
   * @param updates - Partial token data to update (excluding id, address, and timestamps)
   * @returns Promise resolving to the updated token
   */
  async updateToken(
    address: string,
    updates: Partial<Omit<SelectToken, "id" | "address" | "createdAt" | "updatedAt" | "creatorAddress">>,
  ): Promise<SelectToken> {
    return this.repository.updateToken({
      address,
      ...updates,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Deletes a token by its address
   * @param address - The address of the token to delete
   * @returns Promise resolving to the deleted token
   */
  async deleteToken(address: string): Promise<SelectToken> {
    return this.repository.deleteToken(address);
  }

  /**
   * Archives a token by setting its status to "archived"
   * @param address - The address of the token to archive
   * @returns Promise resolving to the archived token
   */
  async archiveToken(address: string): Promise<SelectToken> {
    return this.repository.updateToken({
      address,
      status: "archived",
    });
  }

  /**
   * Checks if a token has any archive status
   * @param address - The address of the token to check
   * @returns Promise resolving to boolean indicating if token is bought
   * @throws Error if token check fails (except for "Token not found")
   */
  async isArchived(address: string): Promise<boolean> {
    const archivedStatuses = ["archived", "honeypot", "rugpull", "noliquidity"];
    try {
      const token = await this.repository.getTokenByAddress(address);
      if (!token) {
        throw new TechnicalError(`Token ${address} not found in database`);
      }
      if (archivedStatuses.includes(token.status)) {
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof TechnicalError && error.message === "Token not found") {
        return false;
      }
      throw error;
    }
  }
}
