export class TechnicalError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "TechnicalError";
  }
}
