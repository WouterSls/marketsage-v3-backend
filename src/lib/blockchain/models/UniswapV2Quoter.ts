import { Contract, ethers, Wallet } from "ethers";

import { ChainConfig } from "../config/chain-config";

import { UNISWAP_V2_ROUTER_ABI } from "../contract-abis/contract-abis";

import { TechnicalError } from "../../errors/TechnicalError";

import { IV2Quoter } from "./interfaces/IV2Quoter";

export class UniswapV2Quoter implements IV2Quoter {
  private readonly NAME = "Uniswap V2Quoter";
  private isInitialized = false;

  //Addresses
  private wethAddress: string = "";
  private udscAddress: string = "";
  private walletAddress: string = "";
  private quoterAddress: string = "";

  //Contract
  private quoterContract: Contract | null = null;

  //Constants
  private readonly WEI_DECIMALS = 18;
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;

  constructor(
    private wallet: Wallet,
    chainConfig: ChainConfig,
  ) {
    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.udscAddress = chainConfig.tokenAddresses.usdc!;
    this.quoterAddress = chainConfig.uniswapV3.quoterAddress;
    this.walletAddress = this.wallet.address;

    if (!this.udscAddress || this.udscAddress.trim() === "") {
      throw new TechnicalError(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new TechnicalError(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new TechnicalError(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, UNISWAP_V2_ROUTER_ABI, this.wallet);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;

  /**
   *
   * @pricing
   */
  async quoteExactInput(path: string[], amountIn: number): Promise<number> {
    return 0;
  }

  async quoteExactInputSingle(path: string[], amountIn: number): Promise<number> {
    return 10;
  }

  async quoteExactOutput(path: string[], amountOut: number): Promise<number> {
    return 0;
  }

  async quoteExactOutputSingle(path: string[], amountOut: number): Promise<number> {
    return 0;
  }
}
