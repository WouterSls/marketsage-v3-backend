export interface IV2Quoter {
  getName(): string;
  /**
   * @Trading
   */
  quoteExactInput(path: string[], amountIn: number): Promise<number>;
  quoteExactInputSingle(path: string[], amountIn: number): Promise<number>;
  quoteExactOutput(path: string[], amountOut: number): Promise<number>;
  quoteExactOutputSingle(path: string[], amountOut: number): Promise<number>;
}
