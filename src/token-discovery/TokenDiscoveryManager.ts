import { Provider } from "ethers";

import { ValidationResult } from "./models/contract-validator.types";
import { ContractValidatorService } from "./services/ContractValidatorService";
import { BlockEventPoller } from "./services/BlockEventPoller";
import { TokenQueueService } from "./services/TokenQueueService";

import { DISCOVERY_CONFIG } from "./config/discovery-config";

import { TokenDiscoveryManagerError } from "../lib/errors/TokenDiscoverManagerError";
import { TokenValidationItem } from "../lib/queues/QueueTypes";

export class TokenDiscoveryManager {
  private static instance: TokenDiscoveryManager;
  private isRunning = false;
  private isInitialized = false;

  private blockEventPoller: BlockEventPoller | null = null;
  private contractValidator: ContractValidatorService | null = null;
  private tokenQueue: TokenQueueService | null = null;

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

  public async initialize(config: { provider: Provider; baseScanApiKey: string }): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log("Initializing Token Discovery Manager");

    try {
      // Initialize components
      this.blockEventPoller = new BlockEventPoller(config.provider);
      this.contractValidator = new ContractValidatorService(config.provider, config.baseScanApiKey);
      this.tokenQueue = new TokenQueueService();

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

  public async start(): Promise<void> {
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

  public async stop(): Promise<void> {
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

  public getStatus(): { isRunning: boolean; statistics: any } {
    return {
      isRunning: this.isRunning,
      statistics: { ...this.statistics },
    };
  }

  private async scanBlocks(): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator || !this.tokenQueue) {
      throw new TokenDiscoveryManagerError("Token Discovery components not initialized");
    }

    try {
      const currentBlock = await this.blockEventPoller.getCurrentBlockNumber();

      if (currentBlock <= this.lastScannedBlock) {
        console.debug("No new blocks to scan");
        return;
      }

      console.log(`Scanning blocks from ${this.lastScannedBlock + 1} to ${currentBlock}`);

      const batchSize = DISCOVERY_CONFIG.blockBatchSize || 10;

      for (let blockNumber = this.lastScannedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
        await this.processBlock(blockNumber);

        this.statistics.blocksScanned++;
        this.statistics.lastScannedBlock = blockNumber;
        this.lastScannedBlock = blockNumber;

        if (this.statistics.blocksScanned % batchSize === 0) {
          console.log(`Processed ${this.statistics.blocksScanned} blocks`);
        }
      }

      console.log(`Block scanning completed. Processed ${currentBlock - this.lastScannedBlock} blocks`);
    } catch (error) {
      console.error("Error during block scanning", error);
      throw error;
    }
  }

  private async processBlock(blockNumber: number): Promise<void> {
    if (!this.blockEventPoller || !this.contractValidator || !this.tokenQueue) {
      throw new TokenDiscoveryManagerError("Token Discovery components not initialized");
    }

    try {
      const contractAddresses = await this.blockEventPoller.getContractCreationsFromBlock(blockNumber);

      if (contractAddresses.length === 0) {
        return;
      }

      console.log(`Found ${contractAddresses.length} contract creations in block ${blockNumber}`);
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
            blockNumber,
          };

          await this.tokenQueue.enqueueToken(token);
          this.statistics.tokensValidated++;
          console.log(`Validated and queued token at address ${address}`);
        }
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber}`, error);
    }
  }
}
