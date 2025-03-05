import { Queue } from "./Queue";

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue<any>> = new Map();

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  getOrCreateQueue<T>(name: string, maxRetries = 3): Queue<T> {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue<T>(name, maxRetries));
    }

    return this.queues.get(name) as Queue<T>;
  }

  getQueue<T>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  removeQueue(name: string): boolean {
    return this.queues.delete(name);
  }

  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  getQueueStats(): Record<string, { size: number; processing: boolean }> {
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
