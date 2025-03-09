import { Provider, Wallet } from "ethers";

import { SelectPosition, PositionService, SelectToken, TokenService, SelectTrade, TradeService } from "../db";
import { ChainConfig, ERC20, createMinimalErc20 } from "../lib/blockchain";
import { AllProtocolsLiquidity, LiquidityCheckingService } from "../token-security-validator";
import { LiquidityDto, LiquidityMapper } from "../api/token-security-validator";

import { MONITOR_CONFIG } from "./config/monitor-config";
import { TokenMonitoringQueueService } from "./queue/TokenMonitoringQueueService";
import { PriceCheckingService } from "./services/PriceCheckingService";

import { TokenMonitorManagerError } from "../lib/errors/TokenMonitorMangerError";

import { TradingService } from "./services/TradingService";
import { TradeType } from "../lib/db/schema";
import { WebhookService } from "../lib/webhooks/WebhookService";
import { TokenDto } from "../api/token-monitor/dtos/TokenDto";
import { TokenMapper } from "../api/token-monitor/dtos/TokenMapper";

export class TokenMonitorManager {
  private static instance: TokenMonitorManager;

  private isInitialized: boolean = false;

  private provider: Provider | null = null;
  private walletAddress: string | null = null;

  private positionService: PositionService | null = null;
  private tokenService: TokenService | null = null;
  private tradeService: TradeService | null = null;

  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;

  private liquidityCheckingService: LiquidityCheckingService | null = null;
  private priceCheckingService: PriceCheckingService | null = null;
  private tradingService: TradingService | null = null;

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
    this.walletAddress = config.wallet.address;

    this.webhookService = WebhookService.getInstance();

    this.positionService = new PositionService();
    this.tokenService = new TokenService();
    this.tradeService = new TradeService();

    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();

    this.liquidityCheckingService = new LiquidityCheckingService(config.provider, config.chainConfig);
    this.priceCheckingService = new PriceCheckingService(config.provider, config.chainConfig);

    this.tradingService = new TradingService(
      config.wallet,
      config.chainConfig,
      this.tradeService,
      this.positionService,
      this.tokenService,
      this.webhookService,
    );

    this.setupTokenMonitor();

    console.log("Token Monitor Manager initialized");
    this.isInitialized = true;
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

    const token: SelectToken | null = await this.tokenService!.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    if (token.status !== "buyable" || token.isSuspicious) {
      throw new TokenMonitorManagerError("Token is not buyable");
    }

    const { isRugpull } = await this.liquidityCheckingService!.rugpullCheck(token);
    if (isRugpull) {
      const updatedToken = await this.tokenService!.updateToken(token.address, { status: "rugpull" });
      const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);
      await this.webhookService!.broadcast("tokenUpdateHook", {
        tokenAddress: token.address,
        data: tokenDto,
      });
      return;
    }

    const erc20 = await createMinimalErc20(token.address, this.provider!);

    await this.tradingService!.buy(token, erc20, tradeType, usdAmount);
  }

  async sellToken(tokenAddress: string, formattedAmount: number): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenMonitorManagerError("Token Monitor Manager not initialized");
    }

    const token: SelectToken | null = await this.tokenService!.getTokenByAddress(tokenAddress);
    if (!token) {
      throw new TokenMonitorManagerError(`No validated token found for address ${tokenAddress}`);
    }

    const buyTrades: SelectTrade[] = await this.tradeService!.getBuyTradesForToken(tokenAddress);
    if (buyTrades.length === 0) {
      throw new TokenMonitorManagerError("No buy trades found for token");
    }

    const erc20: ERC20 = await createMinimalErc20(token.address, this.provider!);

    await this.tradingService!.sell(token, erc20, formattedAmount);
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
      return;
    }

    const priceUsd = await this.priceCheckingService!.getTokenPriceUsd(token, erc20);
    await this.webhookService!.broadcast("priceUpdateHook", {
      tokenAddress: token.address,
      priceUsd: priceUsd.toString(),
    });

    const liquidity: AllProtocolsLiquidity = await this.liquidityCheckingService!.getLiquidity(tokenAddress);
    const liquidityDto: LiquidityDto = LiquidityMapper.toLiquidityDto(liquidity);
    await this.webhookService!.broadcast("liquidityUpdateHook", {
      tokenAddress: token.address,
      data: liquidityDto,
    });

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
        const sellAmount = await erc20.getTokenBalance(this.walletAddress!);

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
          const sellAmount = await erc20.getTokenBalance(this.walletAddress!);
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

      for (const token of tokens) {
        await this.tokenMonitoringQueueService!.enqueueToken(token.address);
      }
    } catch (error) {
      console.error("Error querying tokens for monitoring", error);
      throw error;
    }
  }
}
