export class V2TraderError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "V2TraderError";
  }
}
