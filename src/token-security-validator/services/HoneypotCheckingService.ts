import { Wallet } from "ethers";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";
import { HoneypotError } from "../../lib/errors/HoneypotError";
import { sleep } from "../../lib/utils/helper-functions";

import { ERC20, TradingStrategyFactory } from "../../lib/blockchain/index";
import { SelectToken } from "../../db";
import { TechnicalError } from "../../lib/errors/TechnicalError";

export class HoneypotCheckingService {
  constructor(
    private wallet: Wallet,
    private chainConfig: ChainConfig,
  ) {}

  async honeypotCheck(token: SelectToken, erc20: ERC20): Promise<{ isHoneypot: boolean; reason: string }> {
    const skipableStatuses = ["validated", "sold"];
    if (skipableStatuses.includes(token.status)) {
      return {
        isHoneypot: false,
        reason: "Token is validated",
      };
    }
    if (token.status !== "buyable") {
      throw new HoneypotError("Only buyable tokens can be validated");
    }

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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("not implemented")) {
        return {
          isHoneypot: false,
          reason: errorMessage,
        };
      }
      throw new HoneypotError(`Honeypot check failed: ${errorMessage}`);
    }
  }

  private async testBuy(token: SelectToken, erc20: ERC20) {
    try {
      const buyAmount = SECURITY_VALIDATOR_CONFIG.USD_TEST_AMOUNT;

      const tradingStrategy = TradingStrategyFactory.createStrategy(token.dex, this.wallet, this.chainConfig);

      await tradingStrategy.testBuy(erc20, buyAmount);
    } catch (error: unknown) {
      if (error instanceof TechnicalError) {
        throw error;
      }
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
