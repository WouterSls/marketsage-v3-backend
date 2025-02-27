import { Queue } from "./Queue";

/**
 * Manages multiple queues in the application
 */
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue<any>> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of QueueManager
   */
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Create or get a queue with the specified name
   */
  public createQueue<T>(name: string, maxRetries = 3): Queue<T> {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue<T>(name, maxRetries));
      console.log(`Created new queue: ${name}`);
    }

    return this.queues.get(name) as Queue<T>;
  }

  /**
   * Get an existing queue by name
   */
  public getQueue<T>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  /**
   * Check if a queue exists
   */
  public hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  /**
   * Remove a queue
   */
  public removeQueue(name: string): boolean {
    return this.queues.delete(name);
  }

  /**
   * Get all queue names
   */
  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): Record<string, { size: number; processing: boolean }> {
    const stats: Record<string, { size: number; processing: boolean }> = {};

    this.queues.forEach((queue, name) => {
      stats[name] = {
        size: queue.size(),
        processing: queue.isProcessing(),
      };
    });

    return stats;
  }
}
