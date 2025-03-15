import { Wallet } from "ethers";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";
import { ActiveToken } from "../models/token-security-validator.types";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";
import { HoneypotError } from "../../lib/errors/HoneypotError";
import { sleep } from "../../lib/utils/helper-functions";

import { ERC20, TradingStrategyFactory } from "../../lib/blockchain/index";
import { SelectToken } from "../../db";

export class HoneypotCheckingService {
  constructor(
    private wallet: Wallet,
    private chainConfig: ChainConfig,
  ) {}

  async honeypotCheck(token: SelectToken, erc20: ERC20) {
    try {
      await this.testBuy(token, erc20);

      await sleep(15);
      await this.validateBalance(erc20);

      await this.testSell(token, erc20);

      return {
        isHoneypot: false,
        reason: "No honeypot detected",
      };
    } catch (error) {
      if (error instanceof HoneypotError) {
        return {
          isHoneypot: true,
          reason: error.message,
        };
      }
      throw error;
    }
  }

  private async testBuy(token: SelectToken, erc20: ERC20) {
    try {
      const buyAmount = SECURITY_VALIDATOR_CONFIG.USD_TEST_AMOUNT;
      const tradeType = "usdValue";

      const tradingStrategy = TradingStrategyFactory.createStrategy(token.dex, this.wallet, this.chainConfig);

      await tradingStrategy.buy(token, erc20, buyAmount, tradeType);
    } catch (error) {
      console.log(error);
      throw new HoneypotError(`Test buy failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async testSell(token: SelectToken, erc20: ERC20) {
    try {
      const tradingStrategy = TradingStrategyFactory.createStrategy(token.dex, this.wallet, this.chainConfig);

      const balance = await erc20.getTokenBalance(this.wallet.address);
      await tradingStrategy.testSell(erc20, balance);
    } catch (error) {
      console.log(error);
      throw new HoneypotError(`Sell simulation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async validateBalance(erc20: ERC20) {
    const balance = await erc20.getRawTokenBalance(this.wallet.address);
    if (balance <= 0n) {
      throw new HoneypotError("No tokens received");
    }
  }
}
