import { Contract, ethers, Wallet } from "ethers";

import { ChainConfig } from "../config/chain-config";

import { UNISWAP_V3_FACTORY_ABI } from "../contract-abis/contract-abis";

import { TechnicalError } from "../../errors/TechnicalError";

import { IV3Factory } from "./interfaces/IV3Factory";
import { FeeTier } from "./types/pool.types";

export class UniswapV3Factory implements IV3Factory {
  private readonly NAME = "Uniswap V3Factory";
  private isInitialized = false;

  //Addresses
  private factoryAddress: string = "";
  private wethAddress: string = "";

  //Contract
  private factoryContract: Contract | null = null;

  //Constants
  private readonly WEI_DECIMALS = 18;
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;

  constructor(
    private wallet: Wallet,
    chainConfig: ChainConfig,
  ) {
    this.factoryAddress = chainConfig.uniswapV3.factoryAddress;
    this.wethAddress = chainConfig.tokenAddresses.weth;

    this.factoryContract = new ethers.Contract(this.factoryAddress, UNISWAP_V3_FACTORY_ABI, this.wallet);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;
  getAddress = (): string => this.factoryAddress;

  /**
   *
   * @Info
   */
  async getPoolAddress(addressTokenA: string, addressTokenB: string, fee: FeeTier): Promise<string> {
    console.log("Getting pool address", addressTokenA, addressTokenB, fee);
    throw new TechnicalError("Not implemented");
  }

  async calculatePoolAddress(addressTokenA: string, addressTokenB: string): Promise<string> {
    console.log("Calculating pool address", addressTokenA, addressTokenB);
    throw new TechnicalError("Not implemented");
  }

  async createPool(addressTokenA: string, addressTokenB: string, fee: FeeTier): Promise<string> {
    console.log("Creating pool", addressTokenA, addressTokenB, fee);
    throw new TechnicalError("Not implemented");
  }
}
