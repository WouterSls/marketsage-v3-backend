export class TokenMonitorManagerError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "TokenMonitorManagerError";
  }
}
