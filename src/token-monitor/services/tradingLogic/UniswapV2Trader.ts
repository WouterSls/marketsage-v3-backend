import { ethers, Wallet } from "ethers";

import { ITrader } from "../../interfaces/ITrader";

import { SelectToken, PositionService, TradeService, TokenService } from "../../../db/index";
import { ChainConfig, ERC20, UniswapV2Router, approveTokenSpending } from "../../../lib/blockchain/index";

import { sleep } from "../../../lib/utils/helper-functions";

import { V2TraderError } from "../../../lib/errors/V2TraderError";
import { TradeType } from "../../../lib/db/schema";
import { TradeDto } from "../../../api/token-monitor/dtos/TradeDto";
import { TradeMapper } from "../../../api/token-monitor/dtos/TradeMapper";
import { WebhookService } from "../../../lib/webhooks/WebhookService";
import { TokenDto } from "../../../api/token-monitor/dtos/TokenDto";
import { TokenMapper } from "../../../api/token-monitor/dtos/TokenMapper";

export class UniswapV2Trader implements ITrader {
  private readonly MAX_RETRIES = 3;
  private readonly NAME = "Uniswap V2";

  private readonly uniswapV2Router: UniswapV2Router;

  constructor(
    private readonly wallet: Wallet,
    private readonly chainConfig: ChainConfig,

    private readonly tradeService: TradeService,
    private readonly positionService: PositionService,
    private readonly tokenService: TokenService,
    private readonly webhookService: WebhookService,
  ) {
    this.uniswapV2Router = new UniswapV2Router(this.wallet, this.chainConfig);
  }

  getName = (): string => this.NAME;

  async buy(token: SelectToken, erc20: ERC20, usdAmount: number, _tradeType: TradeType) {
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

        console.log(`Buy failed, attempt ${attempt}/${this.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }

  async sell(token: SelectToken, erc20: ERC20, formattedAmount: number) {
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

        console.log(`Sell failed, attempt ${attempt}/${this.MAX_RETRIES}. Retrying...`);
        await sleep(1);
      }
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (error.message.toLowerCase().includes("insufficient funds")) return false;
    if (error.message.toLowerCase().includes("insufficient allowance")) return false;
    if (error.message.toLowerCase().includes("user rejected")) return false;

    if (attempt >= this.MAX_RETRIES) return false;

    return true;
  }
}
