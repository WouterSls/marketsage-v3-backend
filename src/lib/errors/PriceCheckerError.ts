export class PriceCheckerError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "PriceCheckerError";
  }
}
