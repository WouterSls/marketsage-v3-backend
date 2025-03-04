import { QueueError } from "../../lib/errors/QueueError";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";

export class TokenValidationQueueService {
  private queueManager = QueueManager.getInstance();

  constructor() {
    this.queueManager.getOrCreateQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
  }

  /**
   * Enqueue a token for validation
   *
   * @param token The token to enqueue
   */
  async enqueueToken(token: TokenValidationItem): Promise<void> {
    const tokenValidationQueue = this.queueManager.getQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    if (!tokenValidationQueue) {
      throw new QueueError("Token validation queue not initialized");
    }

    tokenValidationQueue.enqueue(token);
  }
}
