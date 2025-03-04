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
  }

  enqueue(item: T): void {
    const queueItem: QueueItem<T> = {
      data: item,
      timestamp: Date.now(),
      retries: 0,
    };

    this.items.push(queueItem);
    console.log(`[Queue:${this.name}] Item enqueued, queue size: ${this.items.length}`);
    this.emit("enqueued", queueItem);

    if (!this.processing) {
      this.emit("process");
    }
  }

  peek(): QueueItem<T> | undefined {
    return this.items[0];
  }

  dequeue(): QueueItem<T> | undefined {
    const item = this.items.shift();
    if (item) {
      console.log(`[Queue:${this.name}] Item dequeued, queue size: ${this.items.length}`);
    }
    return item;
  }

  size(): number {
    return this.items.length;
  }

  setProcessing(isProcessing: boolean): void {
    this.processing = isProcessing;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  handleFailure(item: QueueItem<T>, error: Error): void {
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

  clear(): void {
    const count = this.items.length;
    this.items = [];
    console.log(`[Queue:${this.name}] Queue cleared, removed ${count} items`);
  }
}
