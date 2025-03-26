import { Wallet } from "ethers";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";
import { HoneypotError } from "../../lib/errors/HoneypotError";
import { sleep } from "../../lib/utils/helper-functions";

import { ERC20, TradingStrategyFactory } from "../../lib/blockchain/index";
import { SelectToken } from "../../db";
import { TechnicalError } from "../../lib/errors/TechnicalError";

import { HoneypotCheckResult, HoneypotReason } from "../../token-monitor/models/token-monitor.types";

export class HoneypotCheckingService {
  constructor(
    private wallet: Wallet,
    private chainConfig: ChainConfig,
  ) {}

  async honeypotCheck(token: SelectToken, erc20: ERC20): Promise<HoneypotCheckResult> {
    let result: HoneypotCheckResult = {
      isHoneypot: false,
      reason: HoneypotReason.SAFE,
    };

    const skipableStatuses = ["validated", "sold"];
    const validationStatuses = ["buyable", "archived"];

    if (skipableStatuses.includes(token.status)) {
      result.isHoneypot = false;
      result.reason = HoneypotReason.VALIDATED;
      return result;
    }

    if (!validationStatuses.includes(token.status)) {
      throw new HoneypotError("Token is not in a valid status");
    }

    try {
      await this.testBuy(token, erc20);

      await sleep(15);
      await this.validateBalance(erc20);

      await this.testSell(token, erc20);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "Unknown error";

      if (errorMessage.includes("not implemented")) {
        result.isHoneypot = false;
        result.reason = HoneypotReason.NOT_IMPLEMENTED;
        return result;
      }

      if (errorMessage.includes("buy failed")) {
        result.isHoneypot = true;
        result.reason = HoneypotReason.BUY_FAILED;
        return result;
      }

      if (errorMessage.includes("no tokens received")) {
        result.isHoneypot = true;
        result.reason = HoneypotReason.NO_TOKENS;
        return result;
      }

      if (errorMessage.includes("sell simulation failed")) {
        result.isHoneypot = true;
        result.reason = HoneypotReason.SELL_FAILED;
        return result;
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
  private async validateBalance(erc20: ERC20) {
    const balance = await erc20.getRawTokenBalance(this.wallet.address);
    if (balance <= 0n) {
      throw new HoneypotError("No tokens received");
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
}
