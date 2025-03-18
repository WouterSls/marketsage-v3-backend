import { Contract, ethers, Provider } from "ethers";

import { ERC20 } from "../../../lib/blockchain/models/Erc20";
import { TechnicalError } from "../../../lib/errors/TechnicalError";
import { IPriceOracle } from "../../interfaces/IPriceOracle";
import { encodePath } from "../../../lib/blockchain/utils/blockchain-utils";
import { ChainConfig } from "../../../lib/blockchain/config/chain-config";
import { UNISWAP_V3_QUOTER_ABI } from "../../../lib/blockchain/contract-abis/contract-abis";
import { AllProtocolsLiquidity, LiquidityCheckingService } from "../../../token-security-validator";

export class V3PriceOracle implements IPriceOracle {
  private isInitialized = false;
  private wethAddress: string = "";
  private usdcAddress: string = "";
  private quoterContract: Contract | null = null;
  private liquidityCheckingService: LiquidityCheckingService | null = null;

  constructor(provider: Provider, chainConfig: ChainConfig) {
    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.usdcAddress = chainConfig.tokenAddresses.usdc!;
    this.quoterContract = new Contract(chainConfig.uniswapV3.quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);
    this.liquidityCheckingService = new LiquidityCheckingService(provider, chainConfig);

    if (!this.usdcAddress || this.usdcAddress.trim() === "") {
      throw new TechnicalError(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new TechnicalError(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    this.isInitialized = true;
  }

  async getEthUsdcPrice(): Promise<number> {
    return 0;
  }

  async getTokenPriceUsdc(erc20: ERC20): Promise<number> {
    if (!this.isInitialized) {
      throw new TechnicalError("V3PriceOracle not properly initialized");
    }

    const allProtocolsLiquidity: AllProtocolsLiquidity = await this.liquidityCheckingService!.getLiquidity(
      erc20.getTokenAddress(),
    );
    const v3Liquidity = allProtocolsLiquidity.v3Liquidity;
    const activePoolFeeTier = v3Liquidity.feeTier;

    if (!activePoolFeeTier) throw new TechnicalError("No active pool available");

    try {
      const path = [erc20.getTokenAddress(), this.wethAddress, this.usdcAddress];

      const fees = [activePoolFeeTier, 500]; //0.05% fee tier (Biggest WETH/USDC pool)

      const amountIn = ethers.parseUnits("1", erc20.getDecimals());
      const encodedPath = encodePath(path, fees);
      const [amountOut] = await this.quoterContract!.quoteExactInput.staticCall(encodedPath, amountIn);

      const outputDecimals = 6;
      const amountFormatted = ethers.formatUnits(amountOut, outputDecimals);

      return parseFloat(amountFormatted);
    } catch (error) {
      console.error("Error getting spot price:", error);
      throw new TechnicalError("Failed to get spot price");
    }
  }

  async getTokenPriceEth(erc20: ERC20): Promise<number> {
    return 0;
  }
}
