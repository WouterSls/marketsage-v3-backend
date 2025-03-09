import { TokenDto, TradeDto } from "../../api/token-monitor/dtos/index";
import { LiquidityDto } from "../../api/token-security-validator/dtos/LiquidityDto";

export type WebhookEventType = "tokenUpdateHook" | "priceUpdateHook" | "liquidityUpdateHook" | "tradeHook";

interface TokenUpdatePayload {
  tokenAddress: string;
  data: TokenDto;
}

interface PriceUpdatePayload {
  tokenAddress: string;
  priceUsd: string;
}

interface LiquidityUpdatePayload {
  tokenAddress: string;
  data: LiquidityDto;
}

interface TradePayload {
  tokenAddress: string;
  data: TradeDto;
}

export interface WebhookPayloadMap {
  tokenUpdateHook: TokenUpdatePayload;
  priceUpdateHook: PriceUpdatePayload;
  liquidityUpdateHook: LiquidityUpdatePayload;
  tradeHook: TradePayload;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEventType[];
  createdAt: number;
}

export interface WebhookDeliverySuccess {
  success: true;
  subscription: WebhookSubscription;
}

export interface WebhookDeliveryFailure {
  success: false;
  subscription: WebhookSubscription;
  error: string;
}
