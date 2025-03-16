import { Provider, Wallet } from "ethers";

import { SelectPosition, PositionService, SelectToken, TokenService, SelectTrade, TradeService } from "../db";
import { ChainConfig, ERC20, TradingStrategyFactory, createMinimalErc20 } from "../lib/blockchain";
import { AllProtocolsLiquidity, HoneypotCheckingService, LiquidityCheckingService } from "../token-security-validator";
import { LiquidityDto, LiquidityMapper } from "../api/token-security-validator";

import { MONITOR_CONFIG } from "./config/monitor-config";
import { TokenMonitoringQueueService } from "./queue/TokenMonitoringQueueService";
import { PriceCheckingService } from "./services/PriceCheckingService";

import { TradeType } from "../lib/db/schema";
import { WebhookService } from "../lib/webhooks/WebhookService";
import { TokenDto, TokenMapper } from "../api/token-monitor/index";
import { TokenMonitorManagerError, V2TraderError, V3TraderError, V4TraderError } from "../lib/errors";
import { TokenMonitorStatistics } from "./models/token-monitor.types";

export class TokenMonitorManager {
  private static instance: TokenMonitorManager;

  private isInitialized: boolean = false;

  private monitoringCount: Set<string> = new Set();
  private statistics = {
    rugpullCount: 0,
    honeypotCount: 0,
  };

  private provider: Provider | null = null;
  private wallet: Wallet | null = null;
  private chainConfig: ChainConfig | null = null;

  private positionService: PositionService | null = null;
  private tokenService: TokenService | null = null;
  private tradeService: TradeService | null = null;

  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;

  private liquidityCheckingService: LiquidityCheckingService | null = null;
  private honeypotCheckingService: HoneypotCheckingService | null = null;
  private priceCheckingService: PriceCheckingService | null = null;

  private webhookService: WebhookService | null = null;

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
    this.chainConfig = config.chainConfig;

    this.webhookService = WebhookService.getInstance();

    this.positionService = new PositionService();
    this.tokenService = new TokenService();
    this.tradeService = new TradeService();

    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();

    this.liquidityCheckingService = new LiquidityCheckingService(config.provider, config.chainConfig);
    this.priceCheckingService = new PriceCheckingService(config.provider, config.chainConfig);

    this.setupTokenMonitor();

    console.log("Token Monitor Manager initialized");
    this.isInitialized = true;
  }

  getStatistics(): TokenMonitorStatistics {
    const statistics: TokenMonitorStatistics = {
      monitoringCount: this.monitoringCount.size,
      rugpullCount: this.statistics.rugpullCount,
      honeypotCount: this.statistics.honeypotCount,
    };

    return statistics;
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

  async buyToken(tokenAddress: string, tradeType: TradeType, usdAmount: number): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenMonitorManagerError("Token Monitor Manager not initialized");
    }
    const { token, erc20 } = await this.validateBuy(tokenAddress, tradeType);

    try {
      const tradingStrategy = TradingStrategyFactory.createStrategy(
        token.dex,
        this.wallet!,
        this.chainConfig!,
        this.tradeService!,
        this.positionService!,
        this.tokenService!,
        this.webhookService!,
      );

      await tradingStrategy.buy(token, erc20, usdAmount, tradeType);
    } catch (error: unknown) {
      if (error instanceof V2TraderError || error instanceof V3TraderError || error instanceof V4TraderError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TokenMonitorManagerError(`Failed to buy token: ${errorMessage}`);
    }
  }
  private async validateBuy(tokenAddress: string, tradeType: TradeType): Promise<{ token: SelectToken; erc20: ERC20 }> {
    const token: SelectToken | null = await this.tokenService!.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const validStatuses = ["buyable", "sold"];
    if (!validStatuses.includes(token.status) || token.isSuspicious) {
      throw new TokenMonitorManagerError("Token is not buyable");
    }

    const validTradeTypes: TradeType[] = ["usdValue", "doubleExit", "earlyExit"];
    if (!validTradeTypes.includes(tradeType)) {
      throw new TokenMonitorManagerError("Invalid trade type");
    }

    console.log("Checking for rugpull...");
    const { isRugpull } = await this.liquidityCheckingService!.rugpullCheck(token);
    if (isRugpull) {
      const updatedToken = await this.tokenService!.updateToken(token.address, { status: "rugpull" });
      const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);
      await this.webhookService!.broadcast("tokenUpdateHook", {
        tokenAddress: token.address,
        data: tokenDto,
      });
      this.statistics.rugpullCount++;
      throw new TokenMonitorManagerError("Token is a rugpull");
    }

    const erc20 = await createMinimalErc20(token.address, this.provider!);

    console.log("Checking for honeypot...");
    const { isHoneypot, reason } = await this.honeypotCheckingService!.honeypotCheck(token, erc20);
    if (isHoneypot) {
      const updatedToken = await this.tokenService!.updateToken(token.address, { status: "honeypot" });
      const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);
      await this.webhookService!.broadcast("tokenUpdateHook", {
        tokenAddress: token.address,
        data: tokenDto,
      });
      this.statistics.honeypotCount++;
      throw new TokenMonitorManagerError(`Token is a honeypot: ${reason}`);
    }

    return { token, erc20 };
  }

  async sellToken(tokenAddress: string, formattedAmount: number): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenMonitorManagerError("Token Monitor Manager not initialized");
    }
    const { token, erc20 } = await this.validateSell(tokenAddress);

    try {
      const tradingStrategy = TradingStrategyFactory.createStrategy(
        token.dex,
        this.wallet!,
        this.chainConfig!,
        this.tradeService!,
        this.positionService!,
        this.tokenService!,
        this.webhookService!,
      );

      await tradingStrategy.sell(token, erc20, formattedAmount);
    } catch (error: unknown) {
      if (error instanceof V2TraderError || error instanceof V3TraderError || error instanceof V4TraderError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TokenMonitorManagerError(`Failed to sell token: ${errorMessage}`);
    }
  }
  private async validateSell(tokenAddress: string): Promise<{ token: SelectToken; erc20: ERC20 }> {
    const token: SelectToken | null = await this.tokenService!.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const buyTrades: SelectTrade[] = await this.tradeService!.getBuyTradesForToken(tokenAddress);
    if (buyTrades.length === 0) {
      throw new TokenMonitorManagerError("No buy trades found for token");
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider!);
    return { token, erc20 };
  }

  async monitorToken(tokenAddress: string): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenMonitorManagerError("Token Monitor Manager not initialized");
    }

    const token: SelectToken | null = await this.tokenService!.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider!);

    const { isRugpull } = await this.liquidityCheckingService!.rugpullCheck(token);
    if (isRugpull) {
      const updatedToken = await this.tokenService!.updateToken(token.address, { status: "rugpull" });
      const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);
      await this.webhookService!.broadcast("tokenUpdateHook", {
        tokenAddress: token.address,
        data: tokenDto,
      });
      this.statistics.rugpullCount++;
      return;
    }

    const priceUsd = await this.priceCheckingService!.getTokenPriceUsd(token, erc20);
    const liquidity: AllProtocolsLiquidity = await this.liquidityCheckingService!.getLiquidity(tokenAddress);
    const liquidityDto: LiquidityDto = LiquidityMapper.toLiquidityDto(liquidity);

    await this.webhookService!.broadcast("priceUpdateHook", {
      tokenAddress: token.address,
      data: {
        priceUsd: priceUsd.toString(),
        liquidity: liquidityDto,
      },
    });

    /**
     * TODO: Add foreign keys
     *  - trade to token (many to one)
     *  - trade to position (many to one)
     *  - token to position (one to one)
     *  - buyTrade to sellTrade (one to many) || sellTrade counter on trade entity?
     *  - token entity should not have a sold status, it should have a balance boolean?
     */
    const tradesToEvaulate: SelectTrade[] = await this.tradeService!.getBuyTradesForToken(tokenAddress);
    for (const trade of tradesToEvaulate) {
      const tradeType = trade.type;

      if (tradeType == "doubleExit") {
        console.log("Executing double exit sell strategy for token:", token.name);
        const tokenPosition = await this.positionService!.getPosition(token.address);
        if (!tokenPosition) {
          throw new TokenMonitorManagerError("No position found for token");
        }
        const entryPrice = tokenPosition?.averageEntryPriceUsd;
        if (!entryPrice) {
          throw new TokenMonitorManagerError("No entry price found for token");
        }

        const targetSellPrice = Number(entryPrice) * 2;
        const sellAmount = await erc20.getTokenBalance(this.wallet!.address);

        if (priceUsd >= targetSellPrice) {
          console.log(`🎯 Selling - Profit target reached`);
          await this.sellToken(token.address, sellAmount);
        } else {
          console.log(`Holding ${token.name} - Current price ($${priceUsd}) and target ($${targetSellPrice})`);
        }
      } else if (tradeType == "earlyExit") {
        console.log("Executing early exit sell strategy for token:", token.name);
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenDiscoveredAt = token.discoveredAt;
        const timeElapsedMinutes = (currentTime - tokenDiscoveredAt) / 60;

        if (timeElapsedMinutes >= MONITOR_CONFIG.EARLY_EXIT_MINUTE_THRESHOLD) {
          console.log(`⏰ Selling - ${MONITOR_CONFIG.EARLY_EXIT_MINUTE_THRESHOLD} minute mark reached`);
          const sellAmount = await erc20.getTokenBalance(this.wallet!.address);
          await this.sellToken(token.address, sellAmount);
        } else {
          console.log(`Holding ${token.name} - time elapsed (${timeElapsedMinutes})`);
        }
      }
    }
  }

  private async setupTokenMonitor(): Promise<void> {
    setInterval(() => {
      this.identifyTokensForMonitoring();
    }, MONITOR_CONFIG.MONITOR_INTERVAL);
  }
  private async identifyTokensForMonitoring(): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenMonitorManagerError("Token Monitor Manager not initialized");
    }

    try {
      const tokens = await this.tokenService!.getTokensByStatus("buyable");

      if (tokens.length === 0) {
        console.log("No tokens to monitor");
        return;
      }

      console.log(`Identified ${tokens.length} tokens to monitor`);

      this.monitoringCount.clear();
      for (const token of tokens) {
        this.monitoringCount.add(token.address);
        await this.tokenMonitoringQueueService!.enqueueToken(token.address);
      }
    } catch (error) {
      console.error("Error querying tokens for monitoring", error);
      throw error;
    }
  }
}
