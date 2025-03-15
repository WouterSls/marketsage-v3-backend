import { Wallet } from "ethers";
import { ChainConfig } from "../../blockchain";
import { ITradingStrategy } from "./ITradingStrategy";
import { UniswapV2Strategy } from "./strategies/UniswapV2Strategy";
import { TradeService, PositionService, TokenService } from "../../../db/index";
import { WebhookService } from "../../../lib/webhooks/WebhookService";
import { TradingServiceError } from "../../../lib/errors/TradingServiceError";
import { DexType } from "../../db/schema";

export class TradingStrategyFactory {
  static createStrategy(
    dexType: DexType,
    wallet: Wallet,
    chainConfig: ChainConfig,
    tradeService?: TradeService,
    positionService?: PositionService,
    tokenService?: TokenService,
    webhookService?: WebhookService,
  ): ITradingStrategy {
    switch (dexType) {
      case "uniswapv2":
        return new UniswapV2Strategy(wallet, chainConfig, tradeService, positionService, tokenService, webhookService);
      case "uniswapv3":
        throw new TradingServiceError("Uniswap V3 trading not implemented yet");
      case "uniswapv4":
        throw new TradingServiceError("Uniswap V4 trading not implemented yet");
      case "aerodrome":
        throw new TradingServiceError("Aerodrome trading not implemented yet");
      default:
        throw new TradingServiceError(`Unsupported DEX type: ${dexType}`);
    }
  }
}
