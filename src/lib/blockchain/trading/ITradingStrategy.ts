import { ERC20 } from "../../blockchain";
import { SelectToken } from "../../../db";
import { TradeType } from "../../../lib/db/schema";

export interface ITradingStrategy {
  getName(): string;

  buy(token: SelectToken, erc20: ERC20, usdAmount: number, tradeType: TradeType): Promise<any>;
  testBuy(erc20: ERC20, usdAmount: number): Promise<any>;

  sell(token: SelectToken, erc20: ERC20, formattedAmount: number): Promise<any>;
  testSell(erc20: ERC20, formattedAmount: number): Promise<any>;
}
