import { ERC20, TradeSuccessInfo } from "../../blockchain";
import { SelectToken } from "../../../db";
import { TradeType } from "../../../lib/db/schema";

export interface ITradingStrategy {
  getName(): string;

  buy(token: SelectToken, erc20: ERC20, usdAmount: number, tradeType: TradeType): Promise<TradeSuccessInfo>;
  testBuy(erc20: ERC20, usdAmount: number): Promise<void>;

  sell(token: SelectToken, erc20: ERC20, formattedAmount: number): Promise<TradeSuccessInfo>;
  testSell(erc20: ERC20, formattedAmount: number): Promise<void>;
}
