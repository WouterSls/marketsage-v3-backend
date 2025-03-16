import { Wallet, Provider, ethers } from "ethers";
import { SetupManagerError } from "../lib/errors";

export class SetupManager {
  private static instance: SetupManager;

  private isInitialized: boolean = false;

  private provider: Provider | null = null;
  private wallet: Wallet | null = null;

  private constructor() {}

  static getInstance(): SetupManager {
    if (!SetupManager.instance) {
      SetupManager.instance = new SetupManager();
    }
    return SetupManager.instance;
  }

  async initialize(config: { provider: Provider; wallet: Wallet }): Promise<void> {
    this.provider = config.provider;
    this.wallet = config.wallet;

    this.isInitialized = true;
  }

  async getWalletInfo(): Promise<{ address: string; ethBalance: string }> {
    if (!this.isInitialized) {
      throw new SetupManagerError("SetupManager not initialized");
    }

    const walletBalance = await this.provider!.getBalance(this.wallet!.address);
    const walletInfo = {
      address: this.wallet!.address,
      ethBalance: ethers.formatEther(walletBalance),
    };

    return walletInfo;
  }
}
