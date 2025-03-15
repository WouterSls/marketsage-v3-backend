import { TokenMonitoringQueueService } from "../token-monitor/queue/TokenMonitoringQueueService";

import { sleep } from "../lib/utils/helper-functions";
import { TokenSecurityValidatorError } from "../lib/errors/TokenSecurityValidatorError";

import { TokenService } from "../db/token/TokenService";
import { ActiveToken, TokenSecurityValidatorStatistics } from "./models/token-security-validator.types";
import { createMinimalErc20 } from "../lib/blockchain/utils/blockchain-utils";
import { Provider, Wallet } from "ethers";
import { LiquidityCheckingService } from "./services/LiquidityCheckingService";
import { ChainConfig } from "../lib/blockchain/config/chain-config";
import { TokenValidationQueueService } from "./queue/TokenValidationQueueService";
import { SECURITY_VALIDATOR_CONFIG } from "./config/security-validator-config";
import { HoneypotCheckingService } from "./services/HoneypotCheckingService";
import { TokenMapper } from "../api/token-monitor/dtos/TokenMapper";
import { TokenDto } from "../api/token-monitor/dtos/TokenDto";
import { WebhookService } from "../lib/webhooks/WebhookService";

export class TokenSecurityValidator {
  private static instance: TokenSecurityValidator;
  private isInitialized: boolean = false;

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
  private honeypotCheckingService: HoneypotCheckingService | null = null;
  private webhookService: WebhookService | null = null;

  private provider: Provider | null = null;

  private constructor() {}

  static getInstance(): TokenSecurityValidator {
    if (!TokenSecurityValidator.instance) {
      TokenSecurityValidator.instance = new TokenSecurityValidator();
    }
    return TokenSecurityValidator.instance;
  }

  async initialize(config: { provider: Provider; wallet: Wallet; chainConfig: ChainConfig }): Promise<void> {
    this.provider = config.provider;

    this.tokenValidationQueueService = new TokenValidationQueueService();
    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();

    this.tokenService = new TokenService();
    this.liquidityCheckingService = new LiquidityCheckingService(config.provider, config.chainConfig);
    this.honeypotCheckingService = new HoneypotCheckingService(config.wallet, config.chainConfig);
    this.webhookService = WebhookService.getInstance();

    this.setupTokenValidator();

    console.log("Token Security Validator initialized");
    this.isInitialized = true;
  }

  getStatistics(): TokenSecurityValidatorStatistics {
    const statistics: TokenSecurityValidatorStatistics = {
      activeTokenCount: this.activeTokens.size,
      honeypotCount: this.statistics.honeypotCount,
      rugpullCount: this.statistics.rugpullCount,
      tokensCreated: this.statistics.tokensCreated,
    };

    return statistics;
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
  getHoneypotCheckingService(): HoneypotCheckingService {
    if (!this.honeypotCheckingService) {
      throw new TokenSecurityValidatorError("Honeypot checking service not initialized");
    }
    return this.honeypotCheckingService;
  }

  async addNewToken(token: { address: string; creatorAddress: string }): Promise<ActiveToken> {
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
      const addedAt = Date.now();

      const activeToken: ActiveToken = {
        address: normalizedAddress,
        creatorAddress: token.creatorAddress,
        addedAt: addedAt,
        expiresAt: addedAt + SECURITY_VALIDATOR_CONFIG.TOKEN_ACTIVE_DURATION_MS,
        hasLiquidity: false,
        protocol: null,
        erc20: erc20,
        isBeingProcessed: false,
      };

      this.activeTokens.set(normalizedAddress, activeToken);
      console.log(`Added token ${normalizedAddress} to active tokens (expires in 10 minutes)`);

      this.identifyTokensForValidation();

      return activeToken;
    } catch (error) {
      console.error(`Error adding token: ${token.address}`, error);
      throw error;
    }
  }

  async validateToken(tokenAddress: string): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenSecurityValidatorError("Token Security Validator not initialized");
    }

    const token = await this.tokenService!.getTokenByAddress(tokenAddress);

    if (token) {
      throw new TokenSecurityValidatorError(`Token ${tokenAddress} already exists in database`);
    }

    const activeToken = this.activeTokens.get(tokenAddress);
    if (!activeToken) {
      throw new TokenSecurityValidatorError(`Token ${tokenAddress} not found in active tokens`);
    }

    try {
      console.log(`Validating Token: ${activeToken.erc20.getName()}`);

      console.log(`\nStarting Liquidity Detection for ${activeToken.erc20.getName()}...`);
      console.log("--------------------------------");
      const { hasLiquidity } = await this.liquidityCheckingService!.validateInitialLiquidity(activeToken);
      if (!hasLiquidity) {
        console.log(`No initial liquidity found`);
        return;
      }

      console.log("Initial liquidity found, waiting for 90 seconds to check for instant rugpull...");
      await sleep(90);
      const { isRugpull } = await this.liquidityCheckingService!.rugpullCheck(activeToken);
      if (isRugpull) {
        console.log("Rugpull detected for token: ", activeToken.erc20.getName());
        this.activeTokens.delete(tokenAddress);
        this.statistics.rugpullCount++;
        return;
      }

      const tokenName = activeToken.erc20.getName();
      const creatorAddress = activeToken.creatorAddress;
      const discoveredAt = activeToken.addedAt;
      const status = "buyable";
      const dex = activeToken.protocol;

      const createdToken = await this.tokenService!.createToken(
        tokenAddress,
        tokenName,
        creatorAddress,
        discoveredAt,
        status,
        dex,
      );
      const tokenDto: TokenDto = TokenMapper.toTokenDto(createdToken);
      await this.webhookService!.broadcast("tokenUpdateHook", {
        tokenAddress: tokenAddress,
        data: tokenDto,
      });
      this.statistics.tokensCreated++;
      this.activeTokens.delete(tokenAddress);

      console.log("Token validated successfully & added to database");
    } finally {
      activeToken.isBeingProcessed = false;
    }
  }

  private async setupTokenValidator(): Promise<void> {
    setInterval(() => {
      console.log("Token validator started...");
      this.cleanExpiredTokens();
      this.identifyTokensForValidation();
    }, SECURITY_VALIDATOR_CONFIG.TOKEN_VALIDATION_INTERVAL_MS);
  }
  private cleanExpiredTokens(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [address, token] of this.activeTokens.entries()) {
      if (token.expiresAt <= now) {
        console.log("expires at", token.expiresAt, "now", now);
        this.activeTokens.delete(address);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Cleaned ${expiredCount} expired tokens, remaining active: ${this.activeTokens.size}`);
    } else {
      console.log("No expired tokens found");
    }
  }
  private async identifyTokensForValidation(): Promise<void> {
    if (!this.tokenValidationQueueService) {
      throw new TokenSecurityValidatorError("Token validation queue service not initialized");
    }

    const activeTokens = this.getActiveTokens();

    if (activeTokens.length === 0) {
      console.log("No tokens to validate");
      return;
    }
    console.log("Identified", activeTokens.length, "tokens for validation");

    for (const token of activeTokens) {
      if (!token.isBeingProcessed) {
        token.isBeingProcessed = true;
        await this.tokenValidationQueueService.enqueueToken(token.address);
      } else {
        console.log(`Token ${token.address} is already being processed, skipping validation`);
      }
    }
  }
}
