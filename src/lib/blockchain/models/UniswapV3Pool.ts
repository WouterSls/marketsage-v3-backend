import { Contract, ethers, Wallet } from "ethers";

import { ChainConfig } from "../config/chain-config";

import { UNISWAP_V2_ROUTER_ABI, UNISWAP_V3_POOL_ABI } from "../contract-abis/contract-abis";

import { TechnicalError } from "../../errors/TechnicalError";

import { IV3Pool } from "./interfaces/IV3Pool";
import { ERC20 } from "./Erc20";
import { TradeSuccessInfo } from "./types/trading.types";
import { FeeTier } from "./types/pool.types";
export class UniswapV3Pool implements IV3Pool {
  private readonly NAME = "UniswapV3 Pool";
  private isInitialized = false;

  //Contract
  private poolContract: Contract | null = null;

  //Constants
  private readonly WEI_DECIMALS = 18;
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;

  constructor(
    private wallet: Wallet,
    private poolAddress: string,
  ) {
    this.poolContract = new ethers.Contract(this.poolAddress, UNISWAP_V3_POOL_ABI, this.wallet);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;
  getAddress = (): string => this.poolAddress;

  /**
   *
   * @Immutables
   */
  async getToken0(): Promise<string> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const token0 = await this.poolContract.token0();
    return token0;
  }
  async getToken1(): Promise<string> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const token1 = await this.poolContract.token1();
    return token1;
  }
  async getFee(): Promise<FeeTier> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const fee = await this.poolContract.fee();
    return fee as FeeTier;
  }

  /**
   *
   * @Actions
   */
  async initializePool(sqrtPriceX96: bigint): Promise<void> {
    console.log("Initializing pool", this.poolAddress, sqrtPriceX96);
    throw new TechnicalError("Not implemented");
  }
  async swap(token: ERC20, usdAmount: number): Promise<TradeSuccessInfo> {
    console.log(`Pool address: ${this.poolAddress}`);
    console.log("Swapping", token.getTokenAddress(), usdAmount);
    throw new TechnicalError("Not implemented");
  }
  async flash(erc20: ERC20, usdAmount: number): Promise<TradeSuccessInfo> {
    console.log("Flashing", erc20.getTokenAddress(), usdAmount);
    throw new TechnicalError("Not implemented");
  }

  /**
   *
   * @State
   */
  async getSlot0(): Promise<bigint> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const slot0 = await this.poolContract.slot0();
    return slot0;
  }
  async getLiquidity(): Promise<bigint> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const liquidity = await this.poolContract.liquidity();
    return liquidity;
  }
  async getTicks(): Promise<bigint> {
    if (!this.poolContract) {
      throw new TechnicalError("Pool contract not initialized");
    }

    const ticks = await this.poolContract.ticks();
    return ticks;
  }
}
