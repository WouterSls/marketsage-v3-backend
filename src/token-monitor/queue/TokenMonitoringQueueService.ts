import { QueueError } from "../../lib/errors/QueueError";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenMonitoringItem } from "../../lib/queues/QueueTypes";

export class TokenMonitoringQueueService {
  private queueManager = QueueManager.getInstance();

  constructor() {
    this.queueManager.getOrCreateQueue<TokenMonitoringItem>(QueueNames.TOKEN_MONITORING);
  }

  /**
   * Enqueue a token for monitoring
   *
   * @param tokenAddress The token address to enqueue
   */
  async enqueueToken(tokenAddress: string): Promise<void> {
    const tokenMonitoringQueue = this.queueManager.getQueue<TokenMonitoringItem>(QueueNames.TOKEN_MONITORING);

    if (!tokenMonitoringQueue) {
      throw new QueueError("Token monitoring queue not initialized");
    }

    const tokenItem: TokenMonitoringItem = {
      address: tokenAddress,
    };

    tokenMonitoringQueue.enqueue(tokenItem);
  }
}
