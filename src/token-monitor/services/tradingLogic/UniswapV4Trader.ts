import { Wallet } from "ethers";

import { SelectToken, TradeService, PositionService, TokenService } from "../../../db/index";
import { TradeType } from "../../../lib/db/schema";

import { ChainConfig, approveTokenSpending, ERC20, TradeSuccessInfo } from "../../../lib/blockchain/index";

import { ITrader } from "../../interfaces/ITrader";

import { V4TraderError } from "../../../lib/errors/V4TraderError";

export class UniswapV4Trader implements ITrader {
  private readonly NAME = "Uniswap V4";
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly wallet: Wallet,
    private readonly chainConfig: ChainConfig,
    private readonly tradeService: TradeService,
    private readonly positionService: PositionService,
    private readonly tokenService: TokenService,
  ) {}

  getName = (): string => this.NAME;

  async buy(token: SelectToken, erc20: ERC20, usdAmount: number, tradeType: TradeType): Promise<TradeSuccessInfo> {
    throw new V4TraderError("V4 trading not implemented yet");
  }

  async sell(token: SelectToken, erc20: ERC20, amount: number): Promise<TradeSuccessInfo> {
    throw new V4TraderError("V4 trading not implemented yet");
  }
}
