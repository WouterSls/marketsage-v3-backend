export class ContractValidatorError extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "ContractValidatorError";
  }
}
