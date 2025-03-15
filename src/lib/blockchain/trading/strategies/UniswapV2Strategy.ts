import { ethers, Wallet } from "ethers";
import { ITradingStrategy } from "../ITradingStrategy";
import { ChainConfig, ERC20, TRADING_CONFIG } from "../../../blockchain";
import { SelectToken } from "../../../../db";
import { TradeType } from "../../../../lib/db/schema";
import { WebhookService } from "../../../../lib/webhooks/WebhookService";
import { TradeService, PositionService, TokenService } from "../../../../db/index";
import { UniswapV2Router } from "../../models/UniswapV2Router";
import { approveTokenSpending } from "../../utils/blockchain-utils";
import { TradeDto, TokenDto, TradeMapper, TokenMapper } from "../../../../api/token-monitor/index";
import { V2TraderError } from "../../../../lib/errors/V2TraderError";
import { sleep } from "../../../../lib/utils/helper-functions";

export class UniswapV2Strategy implements ITradingStrategy {
  private readonly NAME = "Uniswap V2";
  private uniswapV2Router: UniswapV2Router;

  constructor(
    private wallet: Wallet,
    chainConfig: ChainConfig,

    private tradeService?: TradeService,
    private positionService?: PositionService,
    private tokenService?: TokenService,
    private webhookService?: WebhookService,
  ) {
    this.uniswapV2Router = new UniswapV2Router(wallet, chainConfig);
  }

  getName = (): string => this.NAME;

  async buy(token: SelectToken, erc20: ERC20, usdAmount: number, _tradeType: TradeType): Promise<any> {
    if (!this.tradeService || !this.positionService || !this.tokenService || !this.webhookService) {
      throw new V2TraderError("TradeService, PositionService, TokenService, or WebhookService is not initialized");
    }

    let attempt = 0;
    while (true) {
      try {
        const tradeSuccessInfo = await this.uniswapV2Router.swapEthInUsdForToken(erc20, usdAmount);

        const tokenAddress = token.address;
        const tokenName = token.name;
        const status = "buy";
        const tradeType = _tradeType;

        const updatedToken = await this.tokenService.updateToken(tokenAddress, { status: "buyable" });
        const trade = await this.tradeService.createTrade(tokenAddress, tokenName, status, tradeType, tradeSuccessInfo);

        await this.positionService.updatePositionOnBuy(tokenAddress, tokenName, tradeSuccessInfo);

        const tradeDto: TradeDto = TradeMapper.toTradeDto(trade);
        const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);

        await this.webhookService.broadcast("tradeReceiveHook", {
          tokenAddress: token.address,
          data: tradeDto,
        });
        await this.webhookService.broadcast("tokenUpdateHook", {
          tokenAddress: token.address,
          data: tokenDto,
        });

        console.log("V2 Trader: Buy successful");
        return tradeSuccessInfo;
      } catch (error: any) {
        attempt++;

        if (!this.shouldRetry(error, attempt)) {
          throw new V2TraderError(`Buy failed: ${error}`);
        }

        console.log(`Buy failed, attempt ${attempt}/${TRADING_CONFIG.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }
  async testBuy(erc20: ERC20, usdAmount: number): Promise<any> {
    let attempt = 0;
    while (true) {
      try {
        const tradeSuccessInfo = await this.uniswapV2Router.swapEthInUsdForToken(erc20, usdAmount);

        console.log("V2 Trader: Test buy successful");
        return tradeSuccessInfo;
      } catch (error: any) {
        attempt++;

        if (!this.shouldRetry(error, attempt)) {
          throw new V2TraderError(`Buy failed: ${error}`);
        }

        console.log(`Buy failed, attempt ${attempt}/${TRADING_CONFIG.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }

  async sell(token: SelectToken, erc20: ERC20, formattedAmount: number): Promise<any> {
    if (!this.tradeService || !this.positionService || !this.tokenService || !this.webhookService) {
      throw new V2TraderError("TradeService, PositionService, TokenService, or WebhookService is not initialized");
    }

    const rawSellAmount = ethers.parseUnits(formattedAmount.toString(), erc20.getDecimals());

    const allowance = await erc20.getAllowance(this.wallet.address, this.uniswapV2Router.getRouterAddress());
    const rawBalance = await erc20.getRawTokenBalance(this.wallet.address);

    if (rawBalance < rawSellAmount) {
      throw new V2TraderError("Insufficient balance");
    }

    if (allowance < rawSellAmount) {
      console.log("Approving token spending...");
      const approveAmount = (rawSellAmount * 105n) / 100n;
      await approveTokenSpending(this.wallet, erc20, this.uniswapV2Router.getRouterAddress(), approveAmount);
      console.log("Approval successful");
    }

    let attempt = 0;
    while (true) {
      try {
        const tradeSuccessInfo = await this.uniswapV2Router.swapExactTokenForEth(erc20, rawSellAmount);

        const remainingBalance = await erc20.getRawTokenBalance(this.wallet.address);
        const hasRemainingBalance = remainingBalance > 0n;

        const tokenAddress = token.address;
        const tokenName = token.name;
        const status = "sell";
        const tradeType = hasRemainingBalance ? "partialSell" : "fullSell";

        if (!hasRemainingBalance) {
          const updatedToken = await this.tokenService.updateToken(tokenAddress, { status: "sold" });
          const tokenDto: TokenDto = TokenMapper.toTokenDto(updatedToken);
          await this.webhookService.broadcast("tokenUpdateHook", {
            tokenAddress: token.address,
            data: tokenDto,
          });
        }

        const trade = await this.tradeService.createTrade(tokenAddress, tokenName, status, tradeType, tradeSuccessInfo);
        const tradeDto: TradeDto = TradeMapper.toTradeDto(trade);
        await this.webhookService.broadcast("tradeReceiveHook", {
          tokenAddress: token.address,
          data: tradeDto,
        });

        await this.positionService.updatePositionOnSell(tokenAddress, tokenName, tradeSuccessInfo);

        console.log("V2 Trader: Sell successful");
        return tradeSuccessInfo;
      } catch (error: any) {
        attempt++;

        if (!this.shouldRetry(error, attempt)) {
          throw new V2TraderError(`Sell failed: ${error}`);
        }

        console.log(`Sell failed, attempt ${attempt}/${TRADING_CONFIG.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }
  async testSell(erc20: ERC20, formattedAmount: number): Promise<any> {
    try {
      const allowance = await erc20.getAllowance(this.wallet.address, this.uniswapV2Router.getRouterAddress());
      const rawSellAmount = ethers.parseUnits(formattedAmount.toString(), erc20.getDecimals());

      if (allowance < rawSellAmount) {
        console.log(`Allowance: ${allowance} | Raw sell amount: ${rawSellAmount}`);
        const approveAmount = (rawSellAmount * 105n) / 100n;
        console.log("Approving...");
        await approveTokenSpending(this.wallet, erc20, this.uniswapV2Router.getRouterAddress(), approveAmount);
        console.log("Approved");
      }

      await this.uniswapV2Router!.simulateSellSwap(erc20, rawSellAmount);

      console.log(`V2 sell simulation successful`);
    } catch (error) {
      console.log("V2 sell simulation failed");
      console.log(error);
      throw new V2TraderError("V2 sell simulation failed");
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
