import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenMonitoringItem, TokenValidationItem } from "../../lib/queues/QueueTypes";
import { Queue, QueueItem } from "../../lib/queues/Queue";

import { TokenMonitorManager } from "../TokenMonitorManager";
import { MONITOR_CONFIG } from "../config/monitor-config";

export class TokenMonitoringQueueReceiver {
  private static instance: TokenMonitoringQueueReceiver;

  private queueManager = QueueManager.getInstance();
  private queue: Queue<TokenMonitoringItem>;
  private tokenMonitorManager: TokenMonitorManager;

  private isRunning = false;
  private isProcessingQueue = false;

  private constructor(tokenMonitorManager: TokenMonitorManager) {
    this.tokenMonitorManager = tokenMonitorManager;

    this.queue = this.queueManager.getOrCreateQueue<TokenMonitoringItem>(QueueNames.TOKEN_MONITORING);

    this.setupQueueListeners();
    this.start();
  }

  static getInstance(tokenMonitorManager: TokenMonitorManager): TokenMonitoringQueueReceiver {
    if (!TokenMonitoringQueueReceiver.instance) {
      TokenMonitoringQueueReceiver.instance = new TokenMonitoringQueueReceiver(tokenMonitorManager);
    }
    return TokenMonitoringQueueReceiver.instance;
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
      console.log(`Queue Receiver: new token enqueued for processing on queue ${QueueNames.TOKEN_MONITORING}`);
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

  private async processBatchTokens(): Promise<void> {
    const batchSize = MONITOR_CONFIG.MONITOR_BATCH_SIZE;

    if (!this.isRunning || this.queue.size() === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.queue.setProcessing(true);

    try {
      const queueItems: QueueItem<TokenMonitoringItem>[] = [];
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

  private async processTokenItem(queueItem: QueueItem<TokenMonitoringItem>): Promise<void> {
    const { data: token } = queueItem;

    try {
      await this.tokenMonitorManager.monitorToken(token.address);
    } catch (error) {
      console.error(`Error processing token ${token.address}:`, error);
      throw error;
    }
  }
}
