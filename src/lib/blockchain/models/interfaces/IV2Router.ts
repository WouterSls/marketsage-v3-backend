import { ERC20 } from "../Erc20";
import { TradeSuccessInfo } from "../types/trading.types";

export interface IV2Router {
  getName(): string;
  getWETHAddress(): string;
  getRouterAddress(): string;
  /**
   * @pricing
   */
  getEthUsdcPrice(): Promise<number>;
  getTokenPriceUsdc(token: ERC20): Promise<number>;
  getTokenPriceEth(token: ERC20): Promise<number>;
  /**
   * @Buying
   */
  simulateBuySwap(token: ERC20, usdAmount: number): Promise<void>;
  swapEthInUsdForToken(erc20: ERC20, usdAmount: number): Promise<TradeSuccessInfo>;
  /**
   * @Selling
   */
  simulateSellSwap(erc20: ERC20, rawSellAmount: bigint): Promise<void>;
  swapExactTokenForEth(token: ERC20, rawSellAmount: bigint): Promise<TradeSuccessInfo>;
}
