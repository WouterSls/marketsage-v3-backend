export class QueueError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "QueueError";
  }
}

