import { TradeType, TradeStatus } from "../../../lib/db/schema";

export interface TradeDto {
  tokenAddress: string;
  tokenName: string;
  transactionHash: string;
  status: TradeStatus;
  type: TradeType;
  ethSpent: string;
  ethReceived: string;
  formattedSellAmount: string;
  formattedBuyAmount: string;
  gasCostEth: string;
  createdAt: number;
}
