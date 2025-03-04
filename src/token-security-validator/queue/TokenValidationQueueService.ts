import { QueueError } from "../../lib/errors/QueueError";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";

export class TokenValidationQueueService {
  private queueManager = QueueManager.getInstance();
  // Track tokens that are already in the queue
  private tokensInQueue: Set<string> = new Set();

  constructor() {
    this.queueManager.getOrCreateQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    // Listen for dequeue events to remove tokens from tracking
    const queue = this.queueManager.getQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
    if (queue) {
      queue.on("dequeued", (item) => {
        if (item && item.data && item.data.address) {
          this.tokensInQueue.delete(item.data.address.toLowerCase());
        }
      });
    }
  }

  /**
   * Enqueue a token for validation
   *
   * @param tokenAddress The address of the token to enqueue
   */
  async enqueueToken(tokenAddress: string): Promise<void> {
    const tokenValidationQueue = this.queueManager.getQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    if (!tokenValidationQueue) {
      throw new QueueError("Token validation queue not initialized");
    }

    const normalizedAddress = tokenAddress.toLowerCase();

    // Check if token is already in the queue
    if (this.tokensInQueue.has(normalizedAddress)) {
      console.log(`Token ${normalizedAddress} is already in validation queue, skipping`);
      return;
    }

    // Add to tracking set and enqueue
    this.tokensInQueue.add(normalizedAddress);
    tokenValidationQueue.enqueue({ address: normalizedAddress });
  }
}
