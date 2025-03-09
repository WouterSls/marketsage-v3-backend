import { Wallet } from "ethers";

import { TokenStatus, TradeType } from "../../lib/db/schema";
import { TradeService, PositionService, SelectToken, TokenService } from "../../db/index";

import { UniswapV2Trader } from "./tradingLogic/UniswapV2Trader";
import { UniswapV3Trader } from "./tradingLogic/UniswapV3Trader";
import { UniswapV4Trader } from "./tradingLogic/UniswapV4Trader";

import { ChainConfig, ERC20 } from "../../lib/blockchain/index";

import { TradingServiceError } from "../../lib/errors/TradingServiceError";

export class TradingService {
  private readonly uniswapV2Trader: UniswapV2Trader;
  private readonly uniswapV3Trader: UniswapV3Trader;
  private readonly uniswapV4Trader: UniswapV4Trader;

  constructor(
    wallet: Wallet,
    chainConfig: ChainConfig,
    tradeService: TradeService,
    positionService: PositionService,
    tokenService: TokenService,
  ) {
    this.uniswapV2Trader = new UniswapV2Trader(wallet, chainConfig, tradeService, positionService, tokenService);
    this.uniswapV3Trader = new UniswapV3Trader(wallet, chainConfig, tradeService, positionService, tokenService);
    this.uniswapV4Trader = new UniswapV4Trader(wallet, chainConfig, tradeService, positionService, tokenService);
  }

  async buy(token: SelectToken, erc20: ERC20, buyType: TradeType, usdAmount: number) {
    await this.validateBuy(token, buyType);

    switch (token.dex) {
      case "uniswapv2":
        await this.uniswapV2Trader.buy(token, erc20, usdAmount, buyType);
        break;
      case "uniswapv3":
        throw new TradingServiceError("Uniswap V3 trading not implemented yet");
      case "uniswapv4":
        throw new TradingServiceError("Uniswap V4 trading not implemented yet");
      case "aerodrome":
        throw new TradingServiceError("Aerodrome trading not implemented yet");
      default:
        throw new TradingServiceError("Invalid dex");
    }
  }

  async sell(token: SelectToken, erc20: ERC20, formattedAmount: number) {
    switch (token.dex) {
      case "uniswapv2":
        await this.uniswapV2Trader.sell(token, erc20, formattedAmount);
        break;
      case "uniswapv3":
        throw new TradingServiceError("Uniswap V3 trading not implemented yet");
      case "uniswapv4":
        throw new TradingServiceError("Uniswap V4 trading not implemented yet");
      case "aerodrome":
        throw new TradingServiceError("Aerodrome trading not implemented yet");
      default:
        throw new TradingServiceError("Invalid dex");
    }
  }

  private async validateBuy(token: SelectToken, tradeType: TradeType) {
    const invalidStatuses: TokenStatus[] = ["rugpull", "archived"];
    if (invalidStatuses.includes(token.status)) {
      throw new TradingServiceError(`Invalid buying status`);
    }

    const validTradeTypes: TradeType[] = ["usdValue", "doubleExit", "earlyExit"];
    if (!validTradeTypes.includes(tradeType)) {
      throw new TradingServiceError("Invalid trade type");
    }
  }
}
