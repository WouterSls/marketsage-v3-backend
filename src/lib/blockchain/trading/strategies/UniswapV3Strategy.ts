import { ChainConfig } from "../../config/chain-config";
import { ITradingStrategy } from "../ITradingStrategy";
import { PositionService, SelectToken, TokenService, TradeService } from "../../../../db";
import { ERC20 } from "../../models/Erc20";
import { Wallet } from "ethers";
import { Contract } from "ethers";
import { IV3Pool } from "../../models/interfaces/IV3Pool";
import { WebhookService } from "../../../webhooks/WebhookService";
import { UniswapV2Quoter } from "../../models/UniswapV2Quoter";
import { UniswapV3Factory } from "../../models/UniswapV3Factory";
import { UniswapV3Pool } from "../../models/UniswapV3Pool";
import { TechnicalError } from "../../../errors/TechnicalError";
import { V3TraderError } from "../../../errors/V3TraderError";
import { LiquidityCheckingService } from "../../../../token-security-validator/services/LiquidityCheckingService";
import { TRADING_CONFIG } from "../../config/trading-config";
import { sleep } from "../../../utils/helper-functions";
import { TradeSuccessInfo } from "../../models/types/trading.types";

export class UniswapV3Strategy implements ITradingStrategy {
  private readonly NAME = "Uniswap V3";
  private isInitialized = false;

  private uniswapV2Quoter: UniswapV2Quoter;
  //private uniswapV3Pool: IV3Pool;
  private uniswapV3Factory: UniswapV3Factory;

  private liquidityCheckingService: LiquidityCheckingService | null = null;

  private wethAddress: string;
  private usdcAddress: string;

  constructor(
    private wallet: Wallet,
    chainConfig: ChainConfig,
    private tradeService?: TradeService,
    private positionService?: PositionService,
    private tokenService?: TokenService,
    private webhookService?: WebhookService,
  ) {
    this.uniswapV2Quoter = new UniswapV2Quoter(wallet, chainConfig);
    this.uniswapV3Factory = new UniswapV3Factory(wallet, chainConfig);

    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.usdcAddress = chainConfig.tokenAddresses.usdc!;

    const provider = wallet.provider;
    if (!provider) {
      throw new V3TraderError("Provider not found");
    }

    this.liquidityCheckingService = new LiquidityCheckingService(provider, chainConfig);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;

  async buy(token: SelectToken, erc20: ERC20, usdAmount: number): Promise<TradeSuccessInfo> {
    if (!this.isInitialized) {
      throw new V3TraderError("Uniswap V3 strategy is not initialized");
    }

    const liquidityInfo = await this.liquidityCheckingService!.getV3Liquidity(token.address);
    if (!liquidityInfo.exists) {
      throw new V3TraderError("No liquidity found for token");
    }

    console.log(`Liquidity info: ${JSON.stringify(liquidityInfo)}`);
    const poolAddress = liquidityInfo.poolAddress;

    const pool: IV3Pool = new UniswapV3Pool(this.wallet, poolAddress);

    throw new TechnicalError("Not implemented");
  }
  async testBuy(erc20: ERC20, usdAmount: number): Promise<void> {
    let attempt = 0;
    while (true) {
      try {
        const price = await this.uniswapV2Quoter.quoteExactInputSingle([this.wethAddress, this.usdcAddress], usdAmount);

        console.log(`V3 Trader: price estimation: ${price}`);
        return;
      } catch (error: any) {
        attempt++;

        if (!this.shouldRetry(error, attempt)) {
          throw new V3TraderError(`Buy failed: ${error}`);
        }

        console.log(`Buy failed, attempt ${attempt}/${TRADING_CONFIG.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }

  async sell(token: SelectToken, erc20: ERC20, amount: number): Promise<TradeSuccessInfo> {
    throw new TechnicalError("Not implemented");
  }
  async testSell(erc20: ERC20, amount: number): Promise<void> {
    let attempt = 0;
    while (true) {
      try {
        const price = await this.uniswapV2Quoter.quoteExactInputSingle([this.wethAddress, this.usdcAddress], amount);

        console.log(`V3 Trader: price estimation: ${price}`);
        return;
      } catch (error: any) {
        attempt++;

        if (!this.shouldRetry(error, attempt)) {
          throw new V3TraderError(`Buy failed: ${error}`);
        }

        console.log(`Buy failed, attempt ${attempt}/${TRADING_CONFIG.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (error.message.toLowerCase().includes("insufficient funds")) return false;
    if (error.message.toLowerCase().includes("insufficient allowance")) return false;
    if (error.message.toLowerCase().includes("user rejected")) return false;

    if (attempt >= TRADING_CONFIG.MAX_RETRIES) return false;

    return true;
  }
}
