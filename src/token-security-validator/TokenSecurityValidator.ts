import { Provider } from "ethers";
import { QueueManager } from "../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../lib/queues/QueueTypes";
import { Queue } from "../lib/queues/Queue";

/**
 * Token object that is kept active for a period of time
 */
export interface ActiveToken {
  address: string;
  creatorAddress: string;
  addedAt: number;
  expiresAt: number;
}

/**
 * Service that validates the security of tokens
 * and detects potential risks such as honeypots, scams, etc.
 * This service automatically starts and runs continuously when initialized.
 */
export class TokenSecurityValidator {
  private static instance: TokenSecurityValidator;
  private provider: Provider;
  private monitoringQueue: Queue<any>;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  private activeTokens: Map<string, ActiveToken> = new Map();

  // Token will be active for 10 minutes (in milliseconds)
  private readonly TOKEN_ACTIVE_DURATION_MS = 10 * 60 * 1000;

  private constructor(provider: Provider) {
    this.provider = provider;

    // Get the monitoring queue for after validation
    const queueManager = QueueManager.getInstance();
    this.monitoringQueue = queueManager.createQueue(QueueNames.TOKEN_MONITORING);

    // Setup token cleaner
    this.setupTokenCleaner();

    console.log("Token Security Validator initialized");
  }

  /**
   * Get the singleton instance of TokenSecurityValidator
   */
  static getInstance(provider: Provider): TokenSecurityValidator {
    if (!TokenSecurityValidator.instance) {
      TokenSecurityValidator.instance = new TokenSecurityValidator(provider);
    }
    return TokenSecurityValidator.instance;
  }

  /**
   * Get the validator status and health information
   */
  getStatus(): {
    health: string;
    consecutiveErrors: number;
    activeTokenCount: number;
  } {
    const health = this.consecutiveErrors > 0 ? "degraded" : "healthy";

    return {
      health,
      consecutiveErrors: this.consecutiveErrors,
      activeTokenCount: this.activeTokens.size,
    };
  }

  /**
   * Get all currently active tokens
   */
  getActiveTokens(): ActiveToken[] {
    return Array.from(this.activeTokens.values());
  }

  /**
   * Check if a token is currently active
   */
  isTokenActive(address: string): boolean {
    return this.activeTokens.has(address.toLowerCase());
  }

  /**
   * Setup periodic cleaner for expired tokens
   */
  private setupTokenCleaner(): void {
    // Check for expired tokens every minute
    setInterval(() => {
      this.cleanExpiredTokens();
    }, 60 * 1000);
  }

  /**
   * Remove expired tokens from the active tokens map
   */
  private cleanExpiredTokens(): void {
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

  /**
   * Validate a token's security
   * This is the main validation logic that is called by the TokenQueueReceiver
   */
  public async validateTokenSecurity(token: TokenValidationItem): Promise<any> {
    const normalizedAddress = token.address.toLowerCase();

    try {
      console.log(`Validating token security for: ${token.address}`);

      // First add or refresh the token in the active tokens list
      this.addOrRefreshActiveToken(normalizedAddress, token.creatorAddress);

      // TODO: Implement actual security validation logic
      // This would include checks for:
      // 1. Honeypot detection
      // 2. Access control analysis
      // 3. Fee structure analysis
      // 4. Mint function detection
      // 5. Other security risk factors

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Example validation result (replace with actual logic)
      const validationResult = {
        address: token.address,
        creatorAddress: token.creatorAddress,
        isHoneypot: false,
        riskScore: 0,
        securityIssues: [],
        validatedAt: Date.now(),
      };

      // TODO: Store validation result in database
      console.log(`Security validation completed for: ${token.address}`);
      console.log("Result:", validationResult);

      // After validation, enqueue for monitoring if needed
      this.enqueueForMonitoring(token.address);

      // Success - reset error counter
      if (this.consecutiveErrors > 0) {
        this.consecutiveErrors = 0;
        console.log("Token validation recovered from previous errors");
      }

      return validationResult;
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`Error validating token: ${token.address}`, error);
      throw error;
    }
  }

  /**
   * Add a token to the active tokens list or refresh its expiration time if already active
   */
  private addOrRefreshActiveToken(address: string, creatorAddress: string): void {
    const normalizedAddress = address.toLowerCase();

    // Check if token is already active
    if (this.activeTokens.has(normalizedAddress)) {
      console.log(`Token ${address} is already active, refreshing expiration`);
      const activeToken = this.activeTokens.get(normalizedAddress)!;
      activeToken.expiresAt = Date.now() + this.TOKEN_ACTIVE_DURATION_MS;
      return;
    }

    // Create a new active token
    const activeToken: ActiveToken = {
      address: normalizedAddress,
      creatorAddress,
      addedAt: Date.now(),
      expiresAt: Date.now() + this.TOKEN_ACTIVE_DURATION_MS,
    };

    // Add to active tokens
    this.activeTokens.set(normalizedAddress, activeToken);
    console.log(`Added token ${address} to active tokens (expires in 10 minutes)`);
  }

  /**
   * Enqueue a token for monitoring after validation
   */
  private enqueueForMonitoring(address: string): void {
    this.monitoringQueue.enqueue({
      address,
      lastMonitoredAt: null,
      status: "pending",
    });

    console.log(`Enqueued token ${address} for monitoring`);
  }
}
