import { ERC20 } from "../Erc20";
import { FeeTier } from "../types/pool.types";
import { TradeSuccessInfo } from "../types/trading.types";

export interface IV3Factory {
  getName(): string;
  getAddress(): string;

  /**
   * @Info
   */
  getPoolAddress(addressTokenA: string, addressTokenB: string, fee: FeeTier): Promise<string>;
  calculatePoolAddress(addressTokenA: string, addressTokenB: string): Promise<string>;
  createPool(addressTokenA: string, addressTokenB: string, fee: FeeTier): Promise<string>;
}
