import { EventEmitter } from "events";

export interface QueueItem<T> {
  data: T;
  timestamp: number;
  retries?: number;
}

export class Queue<T> extends EventEmitter {
  private items: QueueItem<T>[] = [];
  private processing = false;
  private maxRetries: number;
  private name: string;

  constructor(name: string, maxRetries = 3) {
    super();
    this.name = name;
    this.maxRetries = maxRetries;
    console.log(`Queue initialized: ${name}`);
  }

  /**
   * Add an item to the queue
   */
  public enqueue(item: T): void {
    const queueItem: QueueItem<T> = {
      data: item,
      timestamp: Date.now(),
      retries: 0,
    };

    this.items.push(queueItem);
    console.log(`[Queue:${this.name}] Item enqueued, queue size: ${this.items.length}`);
    this.emit("enqueued", queueItem);

    // Trigger processing if not already processing
    if (!this.processing) {
      this.emit("process");
    }
  }

  /**
   * Get the next item from the queue without removing it
   */
  public peek(): QueueItem<T> | undefined {
    return this.items[0];
  }

  /**
   * Remove and return the next item from the queue
   */
  public dequeue(): QueueItem<T> | undefined {
    const item = this.items.shift();
    if (item) {
      console.log(`[Queue:${this.name}] Item dequeued, queue size: ${this.items.length}`);
    }
    return item;
  }

  /**
   * Get the current queue size
   */
  public size(): number {
    return this.items.length;
  }

  /**
   * Mark the queue as processing or not
   */
  public setProcessing(isProcessing: boolean): void {
    this.processing = isProcessing;
  }

  /**
   * Check if the queue is being processed
   */
  public isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Handle a failed item - either retry or emit failure
   */
  public handleFailure(item: QueueItem<T>, error: Error): void {
    if (item.retries === undefined) {
      item.retries = 0;
    }

    if (item.retries < this.maxRetries) {
      item.retries++;
      console.log(`[Queue:${this.name}] Retrying item, attempt ${item.retries}/${this.maxRetries}`);
      this.items.push(item); // Add back to the end of the queue
      this.emit("retry", item, error);
    } else {
      console.error(`[Queue:${this.name}] Item failed after ${this.maxRetries} attempts`, error);
      this.emit("failure", item, error);
    }
  }

  /**
   * Clear all items from the queue
   */
  public clear(): void {
    const count = this.items.length;
    this.items = [];
    console.log(`[Queue:${this.name}] Queue cleared, removed ${count} items`);
  }
}
