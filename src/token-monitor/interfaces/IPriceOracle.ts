import { ERC20 } from "../../lib/blockchain/models/Erc20";

export interface IPriceOracle {
  getEthUsdcPrice(): Promise<number>;
  getTokenPriceUsdc(erc20: ERC20): Promise<number>;
  getTokenPriceEth(erc20: ERC20): Promise<number>;
}
