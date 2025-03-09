export class V4TraderError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "V4TraderError";
  }
}
