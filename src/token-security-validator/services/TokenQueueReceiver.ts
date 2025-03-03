import { Provider } from "ethers";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";
import { Queue, QueueItem } from "../../lib/queues/Queue";
import { TokenSecurityValidator } from "../TokenSecurityValidator";

/**
 * Service that receives tokens from the queue and forwards them to the TokenSecurityValidator
 */
export class TokenQueueReceiver {
  private static instance: TokenQueueReceiver;
  private provider: Provider;
  private queue: Queue<TokenValidationItem>;
  private isRunning = false;
  private isProcessingQueue = false;
  private tokenValidator: TokenSecurityValidator;

  private constructor(provider: Provider, tokenValidator: TokenSecurityValidator) {
    this.provider = provider;
    this.tokenValidator = tokenValidator;

    // Get the validation queue
    const queueManager = QueueManager.getInstance();
    this.queue = queueManager.createQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    // Setup queue listeners
    this.setupQueueListeners();
    this.start();

    console.log("Token Queue Receiver initialized and started automatically");
  }

  /**
   * Get the singleton instance of TokenQueueReceiver
   */
  static getInstance(provider: Provider, tokenValidator: TokenSecurityValidator): TokenQueueReceiver {
    if (!TokenQueueReceiver.instance) {
      TokenQueueReceiver.instance = new TokenQueueReceiver(provider, tokenValidator);
    }
    return TokenQueueReceiver.instance;
  }

  /**
   * Get the receiver status information
   */
  getStatus(): {
    isRunning: boolean;
    queueSize: number;
    isProcessingQueue: boolean;
  } {
    return {
      isRunning: this.isRunning,
      queueSize: this.queue.size(),
      isProcessingQueue: this.isProcessingQueue,
    };
  }

  /**
   * Setup queue event listeners
   */
  private setupQueueListeners(): void {
    // When a new item is enqueued, start processing if not already
    this.queue.on("enqueued", () => {
      console.log("Queue listener: new token enqueued for processing");
      if (this.isRunning && !this.isProcessingQueue) {
        this.processNextToken();
      }
    });

    // Listen for the process event
    this.queue.on("process", () => {
      if (this.isRunning && !this.isProcessingQueue) {
        this.processNextToken();
      }
    });

    // Handle failure events
    this.queue.on("failure", (item, error) => {
      console.error(`Token processing permanently failed after multiple retries for ${item.data.address}`, error);
    });
  }

  /**
   * Start the receiver
   */
  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

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

    this.isProcessingQueue = true;
    this.queue.setProcessing(true);

    try {
      const queueItem = this.queue.dequeue();

      if (!queueItem) {
        this.isProcessingQueue = false;
        this.queue.setProcessing(false);
        return;
      }

      await this.processTokenItem(queueItem);

      // Process next token if there are more in the queue
      if (this.queue.size() > 0) {
        setImmediate(() => this.processNextToken());
      } else {
        this.isProcessingQueue = false;
        this.queue.setProcessing(false);
      }
    } catch (error) {
      console.error(`Error processing token:`, error);

      this.isProcessingQueue = false;
      this.queue.setProcessing(false);

      // Continue processing after a small delay
      setTimeout(() => {
        if (this.isRunning && this.queue.size() > 0) {
          this.processNextToken();
        }
      }, 1000);
    }
  }

  /**
   * Process a token validation item from the queue
   * Forwards the token to the TokenSecurityValidator
   */
  private async processTokenItem(queueItem: QueueItem<TokenValidationItem>): Promise<void> {
    const { data: token } = queueItem;

    try {
      console.log(`Processing token: ${token.address}`);

      // Send to validator for security validation
      await this.tokenValidator.validateTokenSecurity(token);
    } catch (error) {
      console.error(`Error processing token ${token.address}:`, error);
      throw error;
    }
  }
}
