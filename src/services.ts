import { Provider } from "ethers";
import { TokenSecurityValidator } from "./token-security-validator";
import { TokenMonitorManager } from "./token-monitor";
import { TokenDiscoveryManager } from "./token-discovery/TokenDiscoveryManager";

/**
 * Class to initialize and manage all background services
 */
export class Services {
  private static instance: Services;
  private provider: Provider;
  private baseScanApiKey: string;
  private isInitialized = false;

  private tokenDiscoveryManager: TokenDiscoveryManager | null = null;
  private tokenSecurityValidator: TokenSecurityValidator | null = null;
  private tokenMonitorManager: TokenMonitorManager | null = null;

  private constructor(provider: Provider, baseScanApiKey: string) {
    this.provider = provider;
    this.baseScanApiKey = baseScanApiKey;
  }

  /**
   * Get the singleton instance of Services
   */
  public static getInstance(provider: Provider, baseScanApiKey: string): Services {
    if (!Services.instance) {
      Services.instance = new Services(provider, baseScanApiKey);
    }
    return Services.instance;
  }

  /**
   * Initialize all services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Services already initialized");
      return;
    }

    console.log("Initializing background services...");

    try {
      this.tokenDiscoveryManager = TokenDiscoveryManager.getInstance();
      await this.tokenDiscoveryManager.initialize({
        provider: this.provider,
        baseScanApiKey: this.baseScanApiKey,
      });

      this.tokenSecurityValidator = TokenSecurityValidator.getInstance(this.provider);

      this.tokenMonitorManager = TokenMonitorManager.getInstance(this.provider);

      this.isInitialized = true;
      console.log("All background services initialized successfully");
    } catch (error) {
      console.error("Failed to initialize services", error);
      throw error;
    }
  }

  /**
   * Get status of all services
   */
  public getStatus(): Record<string, any> {
    return {
      isInitialized: this.isInitialized,
      tokenSecurityValidator: this.tokenSecurityValidator
        ? this.tokenSecurityValidator.getStatus()
        : { error: "Not initialized" },
      tokenMonitorManager: this.tokenMonitorManager
        ? this.tokenMonitorManager.getStatus()
        : { error: "Not initialized" },
    };
  }

  /**
   * Shutdown all services (called during application shutdown)
   */
  public async shutdown(): Promise<void> {
    console.log("Shutting down background services...");

    if (this.tokenMonitorManager) {
      this.tokenMonitorManager.stop();
    }

    if (this.tokenSecurityValidator) {
      this.tokenSecurityValidator.emergencyStop();
    }

    console.log("All background services shut down");
  }
}
