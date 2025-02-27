export class Erc20Error extends Error {
  constructor(reason: string) {
    super(`${reason}`);
    this.name = "Erc20Error";
  }
}
