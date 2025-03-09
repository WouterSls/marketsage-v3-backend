import { SelectTrade } from "../../../db/index";
import { TradeDto } from "./TradeDto";

export class TradeMapper {
  public static toTradeDto(trade: SelectTrade): TradeDto {
    return {
      tokenAddress: trade.tokenAddress,
      tokenName: trade.tokenName,
      transactionHash: trade.transactionHash,
      status: trade.status,
      type: trade.type,
      ethSpent: trade.ethSpent,
      ethReceived: trade.ethReceived,
      formattedSellAmount: trade.formattedSellAmount,
      formattedBuyAmount: trade.formattedBuyAmount,
      gasCostEth: trade.gasCostEth,
      createdAt: trade.createdAt,
    };
  }
}
