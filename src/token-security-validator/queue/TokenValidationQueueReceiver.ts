import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";
import { Queue, QueueItem } from "../../lib/queues/Queue";
import { TokenSecurityValidator } from "../TokenSecurityValidator";
import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";

export class TokenValidationQueueReceiver {
  private static instance: TokenValidationQueueReceiver;

  private queueManager = QueueManager.getInstance();
  private queue: Queue<TokenValidationItem>;
  private tokenValidator: TokenSecurityValidator;

  private isRunning = false;
  private isProcessingQueue = false;

  private constructor(tokenValidator: TokenSecurityValidator) {
    this.tokenValidator = tokenValidator;

    this.queue = this.queueManager.getOrCreateQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    this.setupQueueListeners();
    this.start();
  }

  static getInstance(tokenValidator: TokenSecurityValidator): TokenValidationQueueReceiver {
    if (!TokenValidationQueueReceiver.instance) {
      TokenValidationQueueReceiver.instance = new TokenValidationQueueReceiver(tokenValidator);
    }
    return TokenValidationQueueReceiver.instance;
  }

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

  private setupQueueListeners(): void {
    this.queue.on("enqueued", () => {
      console.log(`Queue Receiver: new token enqueued for processing on queue ${QueueNames.TOKEN_VALIDATION}`);
      if (this.isRunning && !this.isProcessingQueue) {
        this.processBatchTokens();
      }
    });

    this.queue.on("process", () => {
      if (this.isRunning && !this.isProcessingQueue) {
        this.processBatchTokens();
      }
    });

    this.queue.on("failure", (item, error) => {
      console.error(`Token processing permanently failed after multiple retries for ${item.data.address}`, error);
    });
  }

  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    if (this.queue.size() > 0) {
      this.processBatchTokens();
    }
  }

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

      setTimeout(() => {
        if (this.isRunning && this.queue.size() > 0) {
          this.processNextToken();
        }
      }, 1000);
    }
  }

  private async processBatchTokens(): Promise<void> {
    const batchSize = SECURITY_VALIDATOR_CONFIG.TOKEN_VALIDATION_BATCH_SIZE;

    if (!this.isRunning || this.queue.size() === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.queue.setProcessing(true);

    try {
      const queueItems: QueueItem<TokenValidationItem>[] = [];
      const actualBatchSize = Math.min(batchSize, this.queue.size());

      for (let i = 0; i < actualBatchSize; i++) {
        const item = this.queue.dequeue();
        if (item) queueItems.push(item);
      }

      if (queueItems.length === 0) {
        this.isProcessingQueue = false;
        this.queue.setProcessing(false);
        return;
      }

      await Promise.all(
        queueItems.map(async (item) => {
          try {
            await this.processTokenItem(item);
          } catch (error) {
            console.error(`Error processing token batch item:`, error);
          }
        }),
      );

      if (this.queue.size() > 0) {
        setImmediate(() => this.processBatchTokens());
      } else {
        this.isProcessingQueue = false;
        this.queue.setProcessing(false);
      }
    } catch (error) {
      console.error(`Error processing token batch:`, error);
      this.isProcessingQueue = false;
      this.queue.setProcessing(false);

      setTimeout(() => {
        if (this.isRunning && this.queue.size() > 0) {
          this.processBatchTokens();
        }
      }, 1000);
    }
  }

  private async processTokenItem(queueItem: QueueItem<TokenValidationItem>): Promise<void> {
    const { data: token } = queueItem;

    try {
      await this.tokenValidator.validateToken(token.address);
    } catch (error) {
      console.error(`Error processing token ${token.address}:`, error);
      throw error;
    }
  }
}
