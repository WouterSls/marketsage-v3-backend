import { Wallet } from "ethers";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";
import { ActiveToken } from "../models/token-security-validator.types";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";
import { HoneypotError } from "../../lib/errors/HoneypotError";
import { sleep } from "../../lib/utils/helper-functions";

import { UniswapV2Router } from "../../lib/blockchain/models/UniswapV2Router";
import { approveTokenSpending } from "../../lib/blockchain/utils/blockchain-utils";

export class HoneypotCheckingService {
  private uniswapV2Router: UniswapV2Router;
  private wallet: Wallet;

  constructor(wallet: Wallet, chainConfig: ChainConfig) {
    this.uniswapV2Router = new UniswapV2Router(wallet, chainConfig);
    this.wallet = wallet;
  }

  async honeypotCheck(token: ActiveToken) {
    try {
      if (!token.hasBalance) {
        await this.testBuying(token);
      }

      if (token.hasBalance) {
        await sleep(15);
        await this.validateBalance(token);
        await this.testSelling(token);
      }

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

  private async testBuying(token: ActiveToken) {
    switch (token.protocol) {
      case "uniV2":
        await this.testBuyV2(token);
        break;
      case "uniV3":
        await this.testBuyV3(token);
        break;
      case "uniV4":
        await this.testBuyV4(token);
        break;
      case "aerodrome":
        await this.testBuyAerodrome(token);
        break;
    }
  }
  private async testBuyV2(token: ActiveToken) {
    try {
      console.log("Starting V2 test buy...");
      const erc20 = token.erc20;
      const buyAmount = SECURITY_VALIDATOR_CONFIG.USD_TEST_AMOUNT;
      const tradeSuccessInfo = await this.uniswapV2Router.swapEthInUsdForToken(erc20, buyAmount);
      token.hasBalance = true;
      console.log(`V2 test buy successful | tx: ${tradeSuccessInfo.transactionHash}`);
    } catch (error) {
      console.log("V2 test buy failed");
      console.log(error);
      throw new HoneypotError("V2 test buy failed");
    }
  }
  private async testBuyV3(token: ActiveToken) {
    console.log("Starting V3 test buy...");
    throw new HoneypotError("Not implemented");
  }
  private async testBuyV4(token: ActiveToken) {
    console.log("Starting V4 test buy...");
    throw new HoneypotError("Not implemented");
  }
  private async testBuyAerodrome(token: ActiveToken) {
    console.log("Starting Aerodrome test buy...");
    throw new HoneypotError("Not implemented");
  }

  private async testSelling(token: ActiveToken) {
    switch (token.protocol) {
      case "uniV2":
        await this.testSellV2(token);
        break;
      case "uniV3":
        await this.testSellV3(token);
        break;
      case "uniV4":
        await this.testSellV4(token);
        break;
      case "aerodrome":
        await this.testSellAerodrome(token);
    }
  }
  private async testSellV2(token: ActiveToken) {
    try {
      console.log("Starting V2 sell simulation...");
      const erc20 = token.erc20;
      const allowance = await erc20.getAllowance(this.wallet.address, this.uniswapV2Router.getRouterAddress());
      const balance = await erc20.getRawTokenBalance(this.wallet.address);

      if (allowance < balance) {
        const balanceFormatted = await erc20.getTokenBalance(this.wallet.address);
        console.log(`Allowance: ${allowance} | Balance: ${balanceFormatted}`);
        const approveAmount = (balance * 105n) / 100n;
        console.log("Approving...");
        await approveTokenSpending(this.wallet, erc20, this.uniswapV2Router.getRouterAddress(), approveAmount);
        console.log("Approved");
      }

      await this.uniswapV2Router!.simulateSellSwap(erc20, balance);

      console.log(`V2 sell simulation successful`);
    } catch (error) {
      console.log("V2 sell simulation failed");
      console.log(error);
      throw new HoneypotError("V2 sell simulation failed");
    }
  }
  private async testSellV3(token: ActiveToken) {
    console.log("Starting V3 test sell...");
    throw new HoneypotError("Not implemented");
  }
  private async testSellV4(token: ActiveToken) {
    console.log("Starting V4 test sell...");
    throw new HoneypotError("Not implemented");
  }
  private async testSellAerodrome(token: ActiveToken) {
    console.log("Starting Aerodrome test sell...");
    throw new HoneypotError("Not implemented");
  }

  private async validateBalance(token: ActiveToken) {
    const erc20 = token.erc20;
    const balance = await erc20.getRawTokenBalance(this.wallet.address);
    if (balance <= 0n) {
      throw new HoneypotError("No tokens received");
    }
  }
}
