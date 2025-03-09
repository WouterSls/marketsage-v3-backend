export class V3TraderError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "V3TraderError";
  }
}
