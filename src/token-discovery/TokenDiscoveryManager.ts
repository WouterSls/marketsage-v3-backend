import { Provider } from "ethers";

import { ValidationResult } from "./models/contract-validator.types";
import { ContractValidatorService } from "./services/ContractValidatorService";
import { BlockEventPoller } from "./services/BlockEventPoller";
import { TokenValidationQueueService } from "../token-security-validator/queue/TokenValidationQueueService";

import { DISCOVERY_CONFIG } from "./config/discovery-config";

import { TokenDiscoveryManagerError } from "../lib/errors/TokenDiscoverManagerError";
import { TokenValidationItem } from "../lib/queues/QueueTypes";

export class TokenDiscoveryManager {
  private static instance: TokenDiscoveryManager;
  private isRunning = false;
  private isInitialized = false;

  private blockEventPoller: BlockEventPoller | null = null;
  private contractValidator: ContractValidatorService | null = null;
  private tokenValidationQueueService: TokenValidationQueueService | null = null;

  private scanInterval: NodeJS.Timeout | null = null;
  private lastScannedBlock = 0;

  private statistics = {
    blocksScanned: 0,
    contractsDiscovered: 0,
    tokensValidated: 0,
    lastScannedBlock: 0,
  };

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
      this.tokenValidationQueueService = new TokenValidationQueueService();

      // Get current block
      this.lastScannedBlock = await config.provider.getBlockNumber();
      this.statistics.lastScannedBlock = this.lastScannedBlock;

      this.isInitialized = true;
      console.log("Token Discovery Manager initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Token Discovery Manager", error);
      throw error;
    }
  }

  getStatus(): { isRunning: boolean; statistics: any } {
    return {
      isRunning: this.isRunning,
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
      this.isRunning = true;

      await this.scanBlocks();

      this.scanInterval = setInterval(
        () => this.scanBlocks().catch((err) => console.error("Error during scheduled scan", err)),
        DISCOVERY_CONFIG.scanIntervalMs,
      );

      console.log("Token Discovery service started successfully");
    } catch (error) {
      console.error("Failed to start Token Discovery service", error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("Token Discovery already stopped");
      return;
    }

    console.log("Stopping Token Discovery service");

    try {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }

      this.isRunning = false;
      console.log("Token Discovery service stopped successfully");
    } catch (error) {
      console.error("Failed to stop Token Discovery service", error);
      throw error;
    }
  }

  private async scanBlocks(): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator || !this.tokenValidationQueueService) {
      throw new TokenDiscoveryManagerError("Token Discovery components not initialized");
    }

    try {
      const currentBlock = await this.blockEventPoller.getCurrentBlockNumber();

      if (currentBlock <= this.lastScannedBlock) {
        console.debug("No new blocks to scan");
        return;
      }

      for (let blockNumber = this.lastScannedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
        console.log(`Processing block ${blockNumber}`);
        await this.processBlock(blockNumber);

        this.statistics.blocksScanned++;
        this.statistics.lastScannedBlock = blockNumber;
        this.lastScannedBlock = blockNumber;
      }
    } catch (error) {
      console.error("Error during block scanning", error);
      throw error;
    }
  }

  private async processBlock(blockNumber: number): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator || !this.tokenValidationQueueService) {
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
        const validationResult: ValidationResult = await this.contractValidator.validateContract(address);

        if (validationResult.isValid) {
          const address = validationResult.address;
          const creatorAddress = validationResult.creatorAddress;

          if (!address || address === "" || address.trim() === "") {
            throw new TokenDiscoveryManagerError("Invalid address");
          }

          if (!creatorAddress || creatorAddress === "" || creatorAddress.trim() === "") {
            throw new TokenDiscoveryManagerError("Invalid creator address");
          }

          const token: TokenValidationItem = {
            address,
            creatorAddress,
            discoveredAt: Date.now(),
          };

          await this.tokenValidationQueueService.enqueueToken(token);
          this.statistics.tokensValidated++;
        }
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber}`, error);
    }
  }
}
