import { Provider } from "ethers";

import { ContractValidatorService } from "./services/ContractValidatorService";
import { BlockEventPoller } from "./services/BlockEventPoller";

import { DISCOVERY_CONFIG } from "./config/discovery-config";

import { TokenDiscoveryManagerError } from "../lib/errors/TokenDiscoveryManagerError";
import { TokenSecurityValidator } from "../token-security-validator/TokenSecurityValidator";
import { TokenDiscoveryInfo } from "./models/token-discovery.types";
import { sleep } from "../lib/utils/helper-functions";

export class TokenDiscoveryManager {
  private static instance: TokenDiscoveryManager;
  private isRunning = false;
  private isInitialized = false;

  private blockEventPoller: BlockEventPoller | null = null;
  private contractValidator: ContractValidatorService | null = null;

  private lastScannedBlock = 0;

  private statistics: TokenDiscoveryInfo["statistics"] = {
    blocksScanned: 0,
    contractsDiscovered: 0,
    invalidContracts: 0,
    validContracts: 0,
    reverifyableContracts: 0,
    lastScannedBlock: 0,
  };

  private revirableContractAddresses: string[] = [];

  private constructor() {}

  static getInstance(): TokenDiscoveryManager {
    if (!TokenDiscoveryManager.instance) {
      TokenDiscoveryManager.instance = new TokenDiscoveryManager();
    }
    return TokenDiscoveryManager.instance;
  }

  async initialize(config: { provider: Provider; baseScanApiKey: string }): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize components
      this.blockEventPoller = new BlockEventPoller(config.provider);
      this.contractValidator = new ContractValidatorService(config.provider, config.baseScanApiKey);

      // Get current block
      this.lastScannedBlock = await config.provider.getBlockNumber();
      this.statistics.lastScannedBlock = this.lastScannedBlock;

      this.isInitialized = true;
      console.log("Token Discovery Manager initialized");
    } catch (error) {
      console.error("Failed to initialize Token Discovery Manager", error);
      throw error;
    }
  }

  getStatus(): TokenDiscoveryInfo {
    return {
      running: this.isRunning,
      statistics: { ...this.statistics },
    };
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new TokenDiscoveryManagerError("Token Discovery Manager not initialized");
    }

    if (this.isRunning) {
      console.log("Token Discovery already running");
      return;
    }

    console.log("Starting Token Discovery service");

    try {
      this.lastScannedBlock = await this.blockEventPoller!.getCurrentBlockNumber();

      this.isRunning = true;

      this.scanBlocks();

      console.log("Token Discovery service started successfully");
    } catch (error) {
      console.error("Failed to start Token Discovery service", error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("Stopping Token Discovery service");

    if (!this.isRunning) {
      console.log("Token Discovery service not running");
      return;
    }

    try {
      this.isRunning = false;

      // Additional cleanup could go here

      console.log("Token Discovery service stopped successfully");
    } catch (error) {
      console.error("Error stopping Token Discovery service:", error);
      // Still mark as not running even if cleanup fails
      this.isRunning = false;
      throw new TokenDiscoveryManagerError(
        `Failed to stop service: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async retryVerification(): Promise<void> {
    if (!this.contractValidator) {
      throw new TokenDiscoveryManagerError("Contract validator not initialized");
    }

    const addressesToRetry = [...this.revirableContractAddresses]; // Create a copy to avoid modifying during iteration
    let successCount = 0;
    let failureCount = 0;

    for (const address of addressesToRetry) {
      try {
        const { isValid, isVerified, creatorAddress } = await this.contractValidator.validateContract(address);

        if (isVerified && isValid) {
          try {
            this.validateAddresses(address, creatorAddress);
            await TokenSecurityValidator.getInstance().addNewToken({
              address,
              creatorAddress: creatorAddress!,
            });
            this.statistics.validContracts++;
            successCount++;
          } catch (validationError) {
            console.error(`Error validating contract ${address}:`, validationError);
            failureCount++;
            continue; // Continue with next address even if this one fails
          }
        }

        // Remove from the retry list regardless of outcome
        this.statistics.reverifyableContracts--;
        const index = this.revirableContractAddresses.indexOf(address);
        if (index !== -1) {
          this.revirableContractAddresses.splice(index, 1);
        }
      } catch (error) {
        console.error(`Error retrying verification for contract ${address}:`, error);
        failureCount++;
        // Don't remove from retry list if verification attempt failed due to error
      }
    }

    console.log(
      `Retry verification completed: ${successCount} succeeded, ${failureCount} failed, ${this.revirableContractAddresses.length} remaining for retry`,
    );
  }

  private async scanBlocks(): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator) {
      throw new TokenDiscoveryManagerError("Token Discovery components not initialized");
    }

    while (this.isRunning) {
      try {
        const currentBlock = await this.blockEventPoller.getCurrentBlockNumber();

        if (currentBlock <= this.lastScannedBlock) {
          console.debug("No new blocks to scan");
          await sleep(DISCOVERY_CONFIG.scanIntervalSeconds);
          continue;
        }

        for (let blockNumber = this.lastScannedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
          try {
            console.log(`Processing block ${blockNumber}`);
            await this.processBlock(blockNumber);

            this.statistics.blocksScanned++;
            this.statistics.lastScannedBlock = blockNumber;
            this.lastScannedBlock = blockNumber;
          } catch (blockError: unknown) {
            const errorMessage = blockError instanceof Error ? blockError.message : "Unknown error";
            console.error(`Error processing block ${blockNumber}`, errorMessage);
          }
        }

        await sleep(DISCOVERY_CONFIG.scanIntervalSeconds);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error during block scanning", errorMessage);
        await sleep(DISCOVERY_CONFIG.scanIntervalSeconds * 2);
      }
    }
  }

  private async processBlock(blockNumber: number): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator) {
      throw new TokenDiscoveryManagerError("Token Discovery components not initialized");
    }

    try {
      const contractAddresses = await this.blockEventPoller.getContractCreationsFromBlock(blockNumber);

      if (contractAddresses.length === 0) {
        return;
      }

      console.log(`Found ${contractAddresses.length} contract creation(s) in block ${blockNumber}`);
      this.statistics.contractsDiscovered += contractAddresses.length;

      for (const address of contractAddresses) {
        const { isValid, isVerified, creatorAddress } = await this.contractValidator.validateContract(address);

        if (!isVerified) {
          this.statistics.reverifyableContracts++;
          this.revirableContractAddresses.push(address);
          continue;
        }

        if (!isValid) {
          this.statistics.invalidContracts++;
          continue;
        }

        this.validateAddresses(address, creatorAddress);

        await TokenSecurityValidator.getInstance().addNewToken({
          address,
          creatorAddress: creatorAddress!,
        });
        this.statistics.validContracts++;
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber}`, error);
    }
  }

  private validateAddresses(contractAddress: string, creatorAddress: string | undefined): void {
    if (!contractAddress || contractAddress === "" || contractAddress.trim() === "") {
      throw new TokenDiscoveryManagerError("Invalid contract address");
    }

    if (!creatorAddress || creatorAddress === "" || creatorAddress.trim() === "") {
      throw new TokenDiscoveryManagerError("Invalid creator address");
    }
  }
}
