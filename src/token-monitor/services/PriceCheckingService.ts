import { Provider } from "ethers";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";

import { SelectToken } from "../../db/token/TokenRepository";

import { ERC20 } from "../../lib/blockchain/models/Erc20";

import { PriceCheckerError } from "../../lib/errors/PriceCheckerError";
import { V2PriceOracle } from "./priceOracles/V2PriceOracle";

export class PriceCheckingService {
  private v2PriceOracle: V2PriceOracle;

  constructor(provider: Provider, chainConfig: ChainConfig) {
    this.v2PriceOracle = new V2PriceOracle(provider, chainConfig);
  }

  async getTokenPriceUsd(token: SelectToken, erc20: ERC20): Promise<number> {
    switch (token.dex) {
      case "uniswapv2":
        return await this.v2PriceOracle.getTokenPriceUsdc(erc20);
      case "uniswapv3":
        throw new PriceCheckerError("Uniswap V3 not implemented");
      // Use QuoterV2 to get price
      case "uniswapv4":
        throw new PriceCheckerError("Uniswap V4 not implemented");
      // research price checking for uniswap v4
      case "aerodrome":
        throw new PriceCheckerError("Aerodrome not implemented");
      // research price checking for aerodrome
      default:
        throw new PriceCheckerError(`Unknown dex: ${token.dex}`);
    }
  }

  private async getTokenPriceEth(token: SelectToken, erc20: ERC20) {
    switch (token.dex) {
      case "uniswapv2":
        return await this.v2PriceOracle.getTokenPriceEth(erc20);
      case "uniswapv3":
        throw new PriceCheckerError("Uniswap V3 not implemented");
      // Use QuoterV2 to get price
      case "uniswapv4":
        throw new PriceCheckerError("Uniswap V4 not implemented");
      // research price checking for uniswap v4
      case "aerodrome":
        throw new PriceCheckerError("Aerodrome not implemented");
      // research price checking for aerodrome
      default:
        throw new PriceCheckerError(`Unknown dex: ${token.dex}`);
    }
  }
}
