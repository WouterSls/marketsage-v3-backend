import { Provider } from "ethers";
import { TokenMonitoringQueueService } from "./queue/TokenMonitoringQueueService";

import { TokenMonitorManagerError } from "../lib/errors/TokenMonitorMangerError";
import { SelectPosition } from "../db/position/PositionRepository";
import { PositionService } from "../db/position/PositionService";
import { SelectToken } from "../db/token/TokenRepository";
import { TokenService } from "../db/token/TokenService";
import { SelectTrade } from "../db/trade/TradeRepository";
import { TradeService } from "../db/trade/TradeService";
import { MONITOR_CONFIG } from "./config/monitor-config";

export class TokenMonitorManager {
  private static instance: TokenMonitorManager;

  private statistics = {
    tokensMonitored: 0,
    tokensSold: 0,
  };

  private provider: Provider | null = null;

  private positionService: PositionService | null = null;
  private tokenService: TokenService | null = null;
  private tradeService: TradeService | null = null;

  private tokenMonitoringQueueService: TokenMonitoringQueueService | null = null;

  private constructor() {}

  static getInstance(): TokenMonitorManager {
    if (!TokenMonitorManager.instance) {
      TokenMonitorManager.instance = new TokenMonitorManager();
    }
    return TokenMonitorManager.instance;
  }

  async initialize(config: { provider: Provider }): Promise<void> {
    this.provider = config.provider;

    this.positionService = new PositionService();
    this.tokenService = new TokenService();
    this.tradeService = new TradeService();

    this.tokenMonitoringQueueService = new TokenMonitoringQueueService();

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

  async monitorToken(tokenAddress: string): Promise<void> {
    console.log("Monitoring token", tokenAddress);
    // TODO: Implement actual monitoring logic
    // update liquidity
    // update price
    // sell if needed
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
