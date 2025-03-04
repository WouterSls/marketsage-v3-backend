import { TokenValidationItem } from "../lib/queues/QueueTypes";
import { TokenMonitoringQueueService } from "../token-monitor/queue/TokenMonitoringQueueService";
import { sleep } from "../lib/utils/helper-functions";
import { TokenSecurityValidatorError } from "../lib/errors/TokenSecurityValidatorError";
import { ActiveToken } from "./models/token-security-validator.types";
import { TokenService } from "../db/token/TokenService";
import { createMinimalErc20 } from "../lib/blockchain/utils/blockchain-utils";
import { Provider, Wallet } from "ethers";
import { LiquidityCheckingService } from "./services/LiquidityCheckingService";
import { ChainConfig } from "../lib/blockchain/models/chain-config";
import { TokenValidationQueueService } from "./queue/TokenValidationQueueService";
import { SECURITY_VALIDATOR_CONFIG } from "./config/security-validator-config";

export class TokenSecurityValidator {
  private static instance: TokenSecurityValidator;
  private isInitialized = false;

  private activeTokens: Map<string, ActiveToken> = new Map();
  private statistics = {
    honeypotCount: 0,
    rugpullCount: 0,
    tokensCreated: 0,
  };

  private tokenValidationQueueService: TokenValidationQueueService | null = null;
  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;

  private tokenService: TokenService | null = null;
  private liquidityCheckingService: LiquidityCheckingService | null = null;
  private provider: Provider | null = null;
  private wallet: Wallet | null = null;

  private constructor() {}

  static getInstance(): TokenSecurityValidator {
    if (!TokenSecurityValidator.instance) {
      TokenSecurityValidator.instance = new TokenSecurityValidator();
    }
    return TokenSecurityValidator.instance;
  }

  async initialize(config: { provider: Provider; wallet: Wallet; chainConfig: ChainConfig }): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.provider = config.provider;
    this.wallet = config.wallet;
    this.tokenValidationQueueService = new TokenValidationQueueService();
    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();
    this.tokenService = new TokenService();
    this.liquidityCheckingService = new LiquidityCheckingService(config.provider, config.chainConfig);

    this.setupTokenValidator();
    //this.setupTokenCleaner();

    console.log("Token Security Validator initialized");

    this.isInitialized = true;
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
  getLiquidityCheckingService(): LiquidityCheckingService {
    if (!this.liquidityCheckingService) {
      throw new TokenSecurityValidatorError("Liquidity checking service not initialized");
    }
    return this.liquidityCheckingService;
  }

  async addNewToken(token: { address: string; creatorAddress: string; discoveredAt: number }): Promise<ActiveToken> {
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
        expiresAt: token.discoveredAt + SECURITY_VALIDATOR_CONFIG.TOKEN_ACTIVE_DURATION_MS,
        hasBalance: false,
        hasLiquidity: false,
        protocol: null,
        erc20: erc20,
        isBeingProcessed: false,
      };

      this.activeTokens.set(normalizedAddress, activeToken);
      console.log(`Added token ${normalizedAddress} to active tokens (expires in 10 minutes)`);

      return activeToken;
    } catch (error) {
      console.error(`Error validating token: ${token.address}`, error);
      throw error;
    }
  }

  async validateToken(tokenAddress: string): Promise<void> {
    if (!this.tokenMonitoringQueueService || !this.tokenService || !this.liquidityCheckingService) {
      throw new TokenSecurityValidatorError("Token monitoring queue service or token service not initialized");
    }

    const activeToken = this.activeTokens.get(tokenAddress);
    if (!activeToken) {
      throw new TokenSecurityValidatorError(`Token ${tokenAddress} not found in active tokens`);
    }

    try {
      console.log(`Validating token: ${tokenAddress}`);

      const liquidityCheckResult = await this.liquidityCheckingService.validateInitialLiquidity(activeToken);
      if (!liquidityCheckResult.hasLiquidity) {
        console.log(`Token ${tokenAddress} does not have liquidity`);
        return;
      }
      console.log("Token has liquidity");
      console.log("token:", activeToken);
      console.log("Sleeping for 90 seconds...");
      await sleep(90);
      console.log("Sleeping done");
      console.log("Insta rug checking...");
      const rugpullCheckResult = await this.liquidityCheckingService.rugpullCheck(activeToken);
      console.log("Rugpull check result:", rugpullCheckResult);

      //await this.validateToken(token);
      //-> await this.honeypotCheck(activeToken);
      console.log("Token validated");

      //this.tokenService.createToken(token.address, token.erc20.getName(), "buyable", token.creatorAddress);
      //this.tokenMonitoringQueueService.enqueueToken(token.address);
    } finally {
      // Reset the processing flag when validation is complete or fails
      if (activeToken) {
        activeToken.isBeingProcessed = false;
      }
    }
  }

  private async setupTokenValidator(): Promise<void> {
    setInterval(() => {
      this.identifyTokensForValidation();
    }, SECURITY_VALIDATOR_CONFIG.TOKEN_VALIDATION_INTERVAL_MS);
  }
  private async identifyTokensForValidation(): Promise<void> {
    if (!this.tokenValidationQueueService) {
      throw new TokenSecurityValidatorError("Token validation queue service not initialized");
    }

    console.log("Validating tokens...");

    const activeTokens = this.getActiveTokens();

    if (activeTokens.length === 0) {
      console.log("No tokens to validate");
      return;
    }
    console.log("Validating", activeTokens.length, "tokens");

    for (const token of activeTokens) {
      if (!token.isBeingProcessed) {
        token.isBeingProcessed = true;
        await this.tokenValidationQueueService.enqueueToken(token.address);
      } else {
        console.log(`Token ${token.address} is already being processed, skipping validation`);
      }
    }
  }

  private setupTokenCleaner(): void {
    setInterval(() => {
      this.cleanExpiredTokens();
    }, SECURITY_VALIDATOR_CONFIG.TOKEN_CLEANUP_INTERVAL_MS);
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
