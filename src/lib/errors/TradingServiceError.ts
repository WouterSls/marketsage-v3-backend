export class TradingServiceError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "TradingServiceError";
  }
}
