import { Wallet } from "ethers";
import { ChainConfig } from "../../blockchain";
import { ITradingStrategy } from "./ITradingStrategy";
import { UniswapV2Strategy } from "./strategies/UniswapV2Strategy";
import { TradeService, PositionService, TokenService } from "../../../db/index";
import { WebhookService } from "../../../lib/webhooks/WebhookService";
import { DexType } from "../../db/schema";
import { TechnicalError } from "../../errors/index";
import { UniswapV3Strategy } from "./strategies/UniswapV3Strategy";

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
        return new UniswapV3Strategy(wallet, chainConfig, tradeService, positionService, tokenService, webhookService);
      case "uniswapv4":
        throw new TechnicalError("Uniswap V4 trading not implemented yet");
      case "aerodrome":
        throw new TechnicalError("Aerodrome trading not implemented yet");
      default:
        throw new TechnicalError(`Unsupported DEX type: ${dexType}`);
    }
  }
}
