import { ERC20 } from "../Erc20";
import { FeeTier } from "../types/pool.types";
import { TradeSuccessInfo } from "../types/trading.types";

export interface IV3Pool {
  getName(): string;
  getAddress(): string;

  /**
   * @Info
   */
  getToken0(): Promise<string>;
  getToken1(): Promise<string>;
  getFee(): Promise<FeeTier>;

  /**
   * @Actions
   */
  initializePool(sqrtPriceX96: bigint): Promise<void>;
  swap(token: ERC20, usdAmount: number): Promise<TradeSuccessInfo>;
  flash(erc20: ERC20, usdAmount: number): Promise<TradeSuccessInfo>;

  /**
   * @State
   */
  getSlot0(): Promise<bigint>;
  getLiquidity(): Promise<bigint>;
  getTicks(): Promise<bigint>;
}
