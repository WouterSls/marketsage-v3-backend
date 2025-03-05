export class HoneypotError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "HoneypotError";
  }
}
