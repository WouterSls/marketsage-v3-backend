import { TokenValidationItem } from "../lib/queues/QueueTypes";
import { TokenMonitoringQueueService } from "../token-monitor/queue/TokenMonitoringQueueService";
import { sleep } from "../lib/utils/helper-functions";
import { TokenSecurityValidatorError } from "../lib/errors/TokenSecurityValidatorError";
import { ActiveToken } from "./models/token-security-validator.types";
import { TokenService } from "../db/token/TokenService";
import { createMinimalErc20 } from "../lib/blockchain/utils/blockchain-utils";
import { Provider } from "ethers";

export class TokenSecurityValidator {
  private static instance: TokenSecurityValidator;

  private readonly TOKEN_ACTIVE_DURATION_MS = 10 * 60 * 1000;
  private activeTokens: Map<string, ActiveToken> = new Map();
  private statistics = {
    honeypotCount: 0,
    rugpullCount: 0,
    tokensCreated: 0,
  };

  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;
  private tokenService: TokenService | null = null;
  private provider: Provider | null = null;

  private constructor() {
    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();
    this.tokenService = new TokenService();

    this.setupTokenCleaner();
    this.setupTokenValidator();

    console.log("Token Security Validator initialized");
  }

  static getInstance(): TokenSecurityValidator {
    if (!TokenSecurityValidator.instance) {
      TokenSecurityValidator.instance = new TokenSecurityValidator();
    }
    return TokenSecurityValidator.instance;
  }

  getStatus(): { statistics: any } {
    return {
      statistics: {
        activeTokenCount: this.activeTokens.size,
        honeypotCount: this.statistics.honeypotCount,
        rugpullCount: this.statistics.rugpullCount,
        tokensCreated: this.statistics.tokensCreated,
      },
    };
  }
  getActiveTokens(): ActiveToken[] {
    return Array.from(this.activeTokens.values());
  }

  async addNewToken(token: TokenValidationItem): Promise<ActiveToken> {
    if (!this.tokenMonitoringQueueService || !this.tokenService) {
      throw new TokenSecurityValidatorError("Token monitoring queue service or token service not initialized");
    }

    const normalizedAddress = token.address.toLowerCase();

    if (this.activeTokens.has(normalizedAddress)) {
      console.log(`Token ${normalizedAddress} already exists in active tokens`);
      return this.activeTokens.get(normalizedAddress)!;
    }

    try {
      const erc20 = await createMinimalErc20(normalizedAddress, this.provider!);

      const activeToken: ActiveToken = {
        address: normalizedAddress,
        creatorAddress: token.creatorAddress,
        addedAt: token.discoveredAt,
        expiresAt: token.discoveredAt + this.TOKEN_ACTIVE_DURATION_MS,
        hasBalance: false,
        hasLiquidity: false,
        erc20: erc20,
      };

      this.activeTokens.set(normalizedAddress, activeToken);
      console.log(`Added token ${normalizedAddress} to active tokens (expires in 10 minutes)`);

      this.validateTokens();

      return activeToken;
    } catch (error) {
      console.error(`Error validating token: ${token.address}`, error);
      throw error;
    }
  }

  private async setupTokenValidator(): Promise<void> {
    setInterval(() => {
      this.validateTokens();
    }, 60 * 1000);
  }
  private async validateTokens(): Promise<void> {
    console.log("Validating tokens...");
    if (!this.tokenMonitoringQueueService || !this.tokenService) {
      throw new TokenSecurityValidatorError("Token monitoring queue service or token service not initialized");
    }
    const activeTokens = this.getActiveTokens();

    for (const token of activeTokens) {
      console.log(`Validating token: ${token.address}`);
      //await this.validateToken(token);
      //-> await this.instaRugCheck(activeToken);
      //-> await this.honeypotCheck(activeToken);
      await sleep(1);

      //this.tokenService.createToken(token.address, token.erc20.getName(), "buyable", token.creatorAddress);
      //this.tokenMonitoringQueueService.enqueueToken(token.address);
    }
  }

  private setupTokenCleaner(): void {
    setInterval(() => {
      this.cleanExpiredTokens();
    }, 60 * 1000);
  }
  private cleanExpiredTokens(): void {
    console.log("Cleaning expired tokens...");
    const now = Date.now();
    let expiredCount = 0;

    for (const [address, token] of this.activeTokens.entries()) {
      if (token.expiresAt <= now) {
        this.activeTokens.delete(address);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Cleaned ${expiredCount} expired tokens, remaining active: ${this.activeTokens.size}`);
    }
  }
}
