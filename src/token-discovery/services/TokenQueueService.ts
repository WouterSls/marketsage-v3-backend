import { QueueError } from "../../lib/errors/QueueError";
import { QueueManager } from "../../lib/queues/QueueManager";
import { QueueNames, TokenValidationItem } from "../../lib/queues/QueueTypes";

/**
 * Service to queue tokens discovered by the TokenDiscoveryManager
 */
export class TokenQueueService {
  private queueManager = QueueManager.getInstance();

  constructor() {
    this.queueManager.createQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
  }

  /**
   * Enqueue a token for validation
   *
   * @param token The token to enqueue
   * @param blockNumber Optional block number where the token was discovered
   */
  public async enqueueToken(token: { address: string; creatorAddress: string }, blockNumber?: number): Promise<void> {
    const tokenValidationQueue = this.queueManager.getQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);

    if (!tokenValidationQueue) {
      throw new QueueError("Token validation queue not initialized");
    }

    const tokenItem: TokenValidationItem = {
      address: token.address,
      creatorAddress: token.creatorAddress,
      blockNumber,
      discoveredAt: Date.now(),
    };

    tokenValidationQueue.enqueue(tokenItem);
  }

  /**
   * Get the number of tokens waiting for validation
   */
  public getQueueSize(): number {
    const tokenValidationQueue = this.queueManager.getQueue<TokenValidationItem>(QueueNames.TOKEN_VALIDATION);
    return tokenValidationQueue ? tokenValidationQueue.size() : 0;
  }
}
