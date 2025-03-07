import { Provider, Wallet } from "ethers";

import { SelectPosition, PositionService, SelectToken, TokenService, SelectTrade, TradeService } from "../db";
import { ChainConfig, ERC20, createMinimalErc20 } from "../lib/blockchain";
import { AllProtocolsLiquidity, LiquidityCheckingService } from "../token-security-validator";
import { LiquidityDto, LiquidityMapper } from "../api/token-security-validator";

import { MONITOR_CONFIG } from "./config/monitor-config";
import { TokenMonitoringQueueService } from "./queue/TokenMonitoringQueueService";
import { PriceCheckingService } from "./services/PriceCheckingService";

import { TokenMonitorManagerError } from "../lib/errors/TokenMonitorMangerError";

export class TokenMonitorManager {
  private static instance: TokenMonitorManager;

  private statistics = {
    tokensMonitored: 0,
    tokensSold: 0,
  };

  private provider: Provider | null = null;
  private wallet: Wallet | null = null;

  private positionService: PositionService | null = null;
  private tokenService: TokenService | null = null;
  private tradeService: TradeService | null = null;

  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;

  private liquidityCheckingService: LiquidityCheckingService | null = null;
  private priceCheckingService: PriceCheckingService | null = null;

  private constructor() {}

  static getInstance(): TokenMonitorManager {
    if (!TokenMonitorManager.instance) {
      TokenMonitorManager.instance = new TokenMonitorManager();
    }
    return TokenMonitorManager.instance;
  }

  async initialize(config: { provider: Provider; chainConfig: ChainConfig; wallet: Wallet }): Promise<void> {
    this.provider = config.provider;
    this.wallet = config.wallet;
    this.positionService = new PositionService();
    this.tokenService = new TokenService();
    this.tradeService = new TradeService();

    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();

    this.liquidityCheckingService = new LiquidityCheckingService(config.provider, config.chainConfig);
    this.priceCheckingService = new PriceCheckingService(config.provider, config.chainConfig);

    this.setupTokenMonitor();

    console.log("Token Monitor Manager initialized");
  }

  getStatus(): { statistics: any } {
    return {
      statistics: this.statistics,
    };
  }

  async getAllPositions(): Promise<SelectPosition[]> {
    if (!this.positionService) {
      throw new TokenMonitorManagerError("Position service not initialized");
    }
    return this.positionService.getAllPositions();
  }
  async getActivePositions(): Promise<SelectPosition[]> {
    if (!this.positionService) {
      throw new TokenMonitorManagerError("Position service not initialized");
    }
    return this.positionService.getActivePositions();
  }
  async getAllTokens(): Promise<SelectToken[]> {
    if (!this.tokenService) {
      throw new TokenMonitorManagerError("Token service not initialized");
    }
    return this.tokenService.getAllTokens();
  }
  async getAllTrades(): Promise<SelectTrade[]> {
    if (!this.tradeService) {
      throw new TokenMonitorManagerError("Trade service not initialized");
    }
    return this.tradeService.getAllTrades();
  }

  async buyToken(tokenAddress: string): Promise<void> {
    if (!this.tokenService || !this.tradeService || !this.provider) {
      throw new TokenMonitorManagerError("Token service or trade service not initialized");
    }

    const token: SelectToken | null = await this.tokenService.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider);
  }

  async sellToken(tokenAddress: string): Promise<void> {
    if (!this.tokenService || !this.tradeService || !this.provider) {
      throw new TokenMonitorManagerError("Token service or trade service not initialized");
    }

    const token: SelectToken | null = await this.tokenService.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider);
  }

  async monitorToken(tokenAddress: string): Promise<void> {
    if (!this.tokenService || !this.liquidityCheckingService || !this.priceCheckingService || !this.provider) {
      throw new TokenMonitorManagerError("Token service not initialized");
    }

    const token: SelectToken | null = await this.tokenService.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider);

    /**
     *
     * Console.log usage should be replaced by a broadcast -> webhook
     */
    const isRugpull = await this.liquidityCheckingService.rugpullCheck(token);
    if (isRugpull) {
      console.log(`Rugpull detection | validated token ${token.name} is a rugpull`);
      await this.tokenService.updateToken(token.address, { status: "rugpull" });
      return;
    }

    const price = await this.priceCheckingService.getTokenPriceUsd(token, erc20);
    console.log(`Token ${token.name} price: ${price} USD on ${token.dex}`);

    const liquidity: AllProtocolsLiquidity = await this.liquidityCheckingService.getLiquidity(tokenAddress);
    const liquidityDto: LiquidityDto = LiquidityMapper.toLiquidityDto(liquidity);
    console.log("Liquidity", JSON.stringify(liquidityDto, null, 2));

    const buyType = token.buyType;
    switch (buyType) {
      case "earlyExit":
        break;
      case "doubleExit":
        break;
      case "usdValue":
        break;
      default:
        throw new TokenMonitorManagerError(`Unknown buy type: ${buyType}`);
    }
  }

  private async setupTokenMonitor(): Promise<void> {
    setInterval(() => {
      this.identifyTokensForMonitoring();
    }, MONITOR_CONFIG.MONITOR_INTERVAL);
  }
  private async identifyTokensForMonitoring(): Promise<void> {
    if (!this.tokenMonitoringQueueService || !this.tokenService) {
      throw new TokenMonitorManagerError("Token monitoring queue service or token service not initialized");
    }

    try {
      const tokens = await this.tokenService.getTokensByStatus("buyable");

      if (tokens.length === 0) {
        console.log("No tokens to monitor");
        return;
      }

      console.log(`Identified ${tokens.length} tokens to monitor`);

      for (const token of tokens) {
        await this.tokenMonitoringQueueService.enqueueToken(token.address);
      }
    } catch (error) {
      console.error("Error querying tokens for monitoring", error);
      throw error;
    }
  }
}
