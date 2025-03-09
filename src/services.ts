import { Provider, Wallet } from "ethers";
import { TokenSecurityValidator } from "./token-security-validator";
import { TokenMonitorManager } from "./token-monitor";
import { TokenDiscoveryManager } from "./token-discovery/TokenDiscoveryManager";
import { getChainConfig } from "./lib/blockchain/config/chain-config";
import { TokenValidationQueueReceiver } from "./token-security-validator/queue/TokenValidationQueueReceiver";
import { TokenMonitoringQueueReceiver } from "./token-monitor/queue/TokenMonitoringQueueReceiver";
import { QueueManager } from "./lib/queues/QueueManager";
import { TokenMonitoringItem, TokenValidationItem } from "./lib/queues/QueueTypes";
import { QueueNames } from "./lib/queues/QueueTypes";
import { WebhookService } from "./lib/webhooks/WebhookService";

export class Services {
  private static instance: Services;
  private provider: Provider;
  private wallet: Wallet;
  private baseScanApiKey: string;
  private isInitialized = false;

  private webhookService: WebhookService | null = null;

  private queueManager: QueueManager | null = null;
  private tokenValidationQueueReceiver: TokenValidationQueueReceiver | null = null;
  private tokenMonitoringQueueReceiver: TokenMonitoringQueueReceiver | null = null;

  private tokenDiscoveryManager: TokenDiscoveryManager | null = null;
  private tokenSecurityValidator: TokenSecurityValidator | null = null;
  private tokenMonitorManager: TokenMonitorManager | null = null;

  private constructor(provider: Provider, wallet: Wallet, baseScanApiKey: string) {
    this.provider = provider;
    this.wallet = wallet;
    this.baseScanApiKey = baseScanApiKey;
  }

  static getInstance(provider: Provider, wallet: Wallet, baseScanApiKey: string): Services {
    if (!Services.instance) {
      Services.instance = new Services(provider, wallet, baseScanApiKey);
    }
    return Services.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Services already initialized");
      return;
    }

    console.log("Initializing background services...");

    try {
      const chainId = await this.provider.getNetwork().then((network) => network.chainId);
      const chainConfig = getChainConfig(chainId);

      this.queueManager = QueueManager.getInstance();
      this.webhookService = WebhookService.getInstance();

      this.queueManager.getOrCreateQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
      this.queueManager.getOrCreateQueue<TokenMonitoringItem>(QueueNames.TOKEN_MONITORING);

      this.tokenDiscoveryManager = TokenDiscoveryManager.getInstance();
      await this.tokenDiscoveryManager.initialize({
        provider: this.provider,
        baseScanApiKey: this.baseScanApiKey,
      });

      this.tokenSecurityValidator = TokenSecurityValidator.getInstance();
      await this.tokenSecurityValidator.initialize({
        provider: this.provider,
        wallet: this.wallet,
        chainConfig: chainConfig,
      });

      this.tokenMonitorManager = TokenMonitorManager.getInstance();
      await this.tokenMonitorManager.initialize({
        provider: this.provider,
        wallet: this.wallet,
        chainConfig: chainConfig,
      });

      this.tokenValidationQueueReceiver = TokenValidationQueueReceiver.getInstance(this.tokenSecurityValidator);
      this.tokenMonitoringQueueReceiver = TokenMonitoringQueueReceiver.getInstance(this.tokenMonitorManager);

      this.isInitialized = true;
      console.log("All background services initialized successfully");
    } catch (error) {
      console.error("Failed to initialize services", error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log("Shutting down background services...");

    if (this.tokenDiscoveryManager) {
      this.tokenDiscoveryManager.stop();
    }

    // Kill websocket connections

    console.log("All background services shut down");
  }
}
