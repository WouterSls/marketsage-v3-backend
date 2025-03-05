export class RouterError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "RouterError";
  }
}
