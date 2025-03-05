import { QueueError } from "../../lib/errors/QueueError";
import { Queue } from "../../lib/queues/Queue";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";

export class TokenValidationQueueService {
  private static instance: TokenValidationQueueService;

  private queue: Queue<TokenValidationItem>;
  private queueManager = QueueManager.getInstance();

  constructor() {
    this.queue = this.queueManager.getOrCreateQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
  }

  static getInstance(): TokenValidationQueueService {
    if (!TokenValidationQueueService.instance) {
      TokenValidationQueueService.instance = new TokenValidationQueueService();
    }
    return TokenValidationQueueService.instance;
  }

  /**
   * Enqueue a token for validation
   *
   * @param tokenAddress The address of the token to enqueue
   */
  enqueueToken(tokenAddress: string): void {
    const normalizedAddress = tokenAddress.toLowerCase();

    if (!this.queue) {
      throw new QueueError("Token validation queue not initialized");
    }

    this.queue.enqueue({ address: normalizedAddress });
  }
}
