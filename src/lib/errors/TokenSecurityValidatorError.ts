export class TokenSecurityValidatorError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "TokenSecurityValidatorError";
  }
}
