export class SetupManagerError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "SetupManagerError";
  }
}
