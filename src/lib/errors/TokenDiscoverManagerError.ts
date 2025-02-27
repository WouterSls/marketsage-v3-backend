export class TokenDiscoveryManagerError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "TokenDiscoveryManagerError";
  }
}
