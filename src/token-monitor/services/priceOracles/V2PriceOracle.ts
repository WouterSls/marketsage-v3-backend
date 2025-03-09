import { Contract, ethers, Provider } from "ethers";

import { ChainConfig } from "../../../lib/blockchain/config/chain-config";
import { ERC20 } from "../../../lib/blockchain/models/Erc20";

import { UNISWAP_V2_ROUTER_ABI } from "../../../lib/blockchain/contract-abis/contract-abis";

import { TechnicalError } from "../../../lib/errors/TechnicalError";
import { RouterError } from "../../../lib/errors/RouterError";

import { IPriceOracle } from "../../interfaces/IPriceOracle";

export class V2PriceOracle implements IPriceOracle {
  private readonly NAME = "UniswapV2Router";
  private isInitialized = false;

  //Addresses
  private wethAddress: string = "";
  private udscAddress: string = "";
  private routerAddress: string = "";

  //Contract
  private routerContract: Contract | null = null;

  //Constants
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;

  constructor(
    private provider: Provider,
    chainConfig: ChainConfig,
  ) {
    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.udscAddress = chainConfig.tokenAddresses.usdc!;
    this.routerAddress = chainConfig.uniswapV2.routerAddress;

    if (!this.udscAddress || this.udscAddress.trim() === "") {
      throw new TechnicalError(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new TechnicalError(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new TechnicalError(`UniV2 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNISWAP_V2_ROUTER_ABI, this.provider);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;
  getWETHAddress = (): string => this.wethAddress;
  getRouterAddress = (): string => this.routerAddress;

  /**
   *
   * @pricing
   *
   */
  async getEthUsdcPrice() {
    if (!this.isInitialized) throw new TechnicalError(`${this.NAME} not initialized`);
    const tradePath = [this.wethAddress, this.udscAddress];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);
    const amountsOut = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return parseFloat(amountFormatted);
  }
  async getTokenPriceUsdc(token: ERC20): Promise<number> {
    try {
      if (!this.isInitialized) throw new TechnicalError(`${this.NAME} not initialized`);

      const tradePath = [token.getTokenAddress(), this.wethAddress, this.udscAddress];
      const inputAmount = ethers.parseUnits("1", token.getDecimals());

      const amountsOut: BigInt[] = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
      const amountOut = amountsOut[amountsOut.length - 1];

      const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);

      return parseFloat(amountFormatted);
    } catch (error: unknown) {
      console.error(`Error getting token ${token.getName()} USDC price on UniV2Router: `, error);
      if (error instanceof TechnicalError) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new TechnicalError(`UniV2Router token ${token.getName()} USDC price error: ${errorMessage}`);
    }
  }
  async getTokenPriceEth(token: ERC20) {
    try {
      if (!this.isInitialized) throw new RouterError("Router not initialized");

      const tradePath = [token.getTokenAddress(), this.wethAddress];

      const inputAmount = ethers.parseUnits("1", token.getDecimals());

      const amountsOut: BigInt[] = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
      const amountOut = amountsOut[amountsOut.length - 1];

      const amountFormatted = ethers.formatUnits(amountOut.toString(), this.WETH_DECIMALS);

      return parseFloat(amountFormatted);
    } catch (error: unknown) {
      console.error(`Error getting token ${token.getName()} ETH price on UniV2Router: `, error);
      if (error instanceof RouterError) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new RouterError(`UniV2Router token ${token.getName()} price error: ${errorMessage}`);
    }
  }
}
