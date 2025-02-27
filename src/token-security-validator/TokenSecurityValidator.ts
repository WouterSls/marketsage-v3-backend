import { Provider } from "ethers";
import { QueueManager } from "../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../lib/queues/QueueTypes";
import { Queue, QueueItem } from "../lib/queues/Queue";

/**
 * Service that validates the security of tokens
 * and detects potential risks such as honeypots, scams, etc.
 * This service automatically starts and runs continuously when initialized.
 */
export class TokenSecurityValidator {
  private static instance: TokenSecurityValidator;
  private provider: Provider;
  private queue: Queue<TokenValidationItem>;
  private isRunning = false;
  private isProcessingToken = false;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  private errorResetTimeoutMs = 10000;

  private constructor(provider: Provider) {
    this.provider = provider;

    // Get the validation queue
    const queueManager = QueueManager.getInstance();
    this.queue = queueManager.createQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    // Auto-start when initialized
    this.setupQueueListeners();
    this.start();

    console.log("Token Security Validator initialized and started automatically");
  }

  /**
   * Get the singleton instance of TokenSecurityValidator
   * The validator starts automatically when created
   */
  public static getInstance(provider: Provider): TokenSecurityValidator {
    if (!TokenSecurityValidator.instance) {
      TokenSecurityValidator.instance = new TokenSecurityValidator(provider);
    }
    return TokenSecurityValidator.instance;
  }

  /**
   * Get the validator status and health information
   */
  public getStatus(): {
    isRunning: boolean;
    queueSize: number;
    isProcessingToken: boolean;
    health: string;
    consecutiveErrors: number;
  } {
    const health = this.isRunning ? (this.consecutiveErrors > 0 ? "degraded" : "healthy") : "stopped";

    return {
      isRunning: this.isRunning,
      queueSize: this.queue.size(),
      isProcessingToken: this.isProcessingToken,
      health,
      consecutiveErrors: this.consecutiveErrors,
    };
  }

  /**
   * For emergency cases only - stops the validator
   * (Not typically needed as the validator runs for the lifetime of the app)
   */
  public emergencyStop(): void {
    if (!this.isRunning) {
      console.log("Token Security Validator is already stopped");
      return;
    }

    console.log("EMERGENCY STOP: Token Security Validator");
    this.isRunning = false;
  }

  /**
   * Restarts the validator if it was stopped
   * (Not typically needed as the validator runs for the lifetime of the app)
   */
  public restart(): void {
    this.consecutiveErrors = 0;
    if (!this.isRunning) {
      this.start();
    } else {
      console.log("Token Security Validator is already running");
    }
  }

  /**
   * Setup queue event listeners
   */
  private setupQueueListeners(): void {
    // When a new item is enqueued, start processing if not already
    this.queue.on("enqueued", () => {
      console.log("New token enqueued for validation");
      if (this.isRunning && !this.isProcessingToken) {
        this.processNextToken();
      }
    });

    // Listen for the process event
    this.queue.on("process", () => {
      if (this.isRunning && !this.isProcessingToken) {
        this.processNextToken();
      }
    });

    // Handle failure events
    this.queue.on("failure", (item, error) => {
      console.error(`Token validation permanently failed after multiple retries for ${item.data.address}`, error);
      // Could add alerting or special handling for failed tokens here
    });
  }

  /**
   * Private method to start the validator
   */
  private start(): void {
    if (this.isRunning) {
      return;
    }

    console.log("Starting Token Security Validator");
    this.isRunning = true;

    // If items are in the queue, start processing
    if (this.queue.size() > 0) {
      this.processNextToken();
    }
  }

  /**
   * Process the next token in the queue
   */
  private async processNextToken(): Promise<void> {
    if (!this.isRunning || this.queue.size() === 0) {
      return;
    }

    // Setting these states separately for more detailed health monitoring
    this.isProcessingToken = true;
    this.queue.setProcessing(true);

    try {
      const queueItem = this.queue.dequeue();

      if (!queueItem) {
        this.isProcessingToken = false;
        this.queue.setProcessing(false);
        return;
      }

      await this.validateToken(queueItem);

      // Success - reset error counter
      if (this.consecutiveErrors > 0) {
        this.consecutiveErrors = 0;
        console.log("Token validation recovered from previous errors");
      }

      // Process next token if there are more in the queue
      if (this.queue.size() > 0) {
        setImmediate(() => this.processNextToken());
      } else {
        this.isProcessingToken = false;
        this.queue.setProcessing(false);
      }
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`Error processing token (consecutive errors: ${this.consecutiveErrors})`, error);

      // If too many consecutive errors, pause processing briefly but recover automatically
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(
          `Too many consecutive errors (${this.consecutiveErrors}), pausing validation for ${this.errorResetTimeoutMs}ms`,
        );

        this.isProcessingToken = false;
        this.queue.setProcessing(false);

        // Auto-recover after timeout
        setTimeout(() => {
          console.log("Attempting to auto-recover token validation after pause");
          this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 3); // Reduce error count but don't fully reset

          if (this.isRunning && this.queue.size() > 0) {
            this.processNextToken();
          }
        }, this.errorResetTimeoutMs);
      } else {
        // Continue processing despite error
        this.isProcessingToken = false;
        this.queue.setProcessing(false);

        // Continue processing next token after a small delay
        setTimeout(() => {
          if (this.isRunning && this.queue.size() > 0) {
            this.processNextToken();
          }
        }, 1000); // Brief 1-second pause
      }
    }
  }

  /**
   * Validate a token's security
   */
  private async validateToken(queueItem: QueueItem<TokenValidationItem>): Promise<void> {
    const { data: token } = queueItem;

    try {
      console.log(`Validating token security for: ${token.address}`);

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

      // After validation, it could be enqueued for monitoring if needed
      this.enqueueForMonitoring(token.address);
    } catch (error) {
      console.error(`Error validating token: ${token.address}`, error);
      throw error;
    }
  }

  /**
   * Enqueue a token for monitoring after validation
   */
  private enqueueForMonitoring(address: string): void {
    // Get the monitoring queue
    const queueManager = QueueManager.getInstance();
    const monitorQueue = queueManager.createQueue(QueueNames.TOKEN_MONITORING);

    monitorQueue.enqueue({
      address,
      lastMonitoredAt: null,
      status: "pending",
    });

    console.log(`Enqueued token ${address} for monitoring`);
  }
}
