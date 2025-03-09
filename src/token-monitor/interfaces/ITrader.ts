import { SelectToken } from "../../db/token/TokenRepository";

import { ERC20, TradeSuccessInfo } from "../../lib/blockchain/index";
import { TradeType } from "../../lib/db/schema";

export interface ITrader {
  getName(): string;
  buy(token: SelectToken, erc20: ERC20, usdAmount: number, tradeType: TradeType): Promise<TradeSuccessInfo>;
  sell(token: SelectToken, erc20: ERC20, amount: number): Promise<TradeSuccessInfo>;
}
