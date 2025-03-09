import { Wallet } from "ethers";

import { SelectToken, TradeService, PositionService, TokenService } from "../../../db/index";
import { TradeType } from "../../../lib/db/schema";

import { ChainConfig, approveTokenSpending, ERC20, TradeSuccessInfo } from "../../../lib/blockchain/index";

import { ITrader } from "../../interfaces/ITrader";

import { V3TraderError } from "../../../lib/errors/V3TraderError";

export class UniswapV3Trader implements ITrader {
  private readonly NAME = "Uniswap V3";
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
    throw new V3TraderError("V3 trading not implemented yet");
  }

  async sell(token: SelectToken, erc20: ERC20, amount: number): Promise<TradeSuccessInfo> {
    throw new V3TraderError("V3 trading not implemented yet");
  }
}
