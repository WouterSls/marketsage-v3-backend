import { ethers, Provider } from "ethers";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { TransferEventInfo, FilteredEthersEvent } from "../models/block-event.types";
import { TechnicalError } from "../../lib/errors/TechnicalError";

/**
/**
 *
 * Polling based token monitor
 * -> Alchemy public http rpc doesn't not support event subscription
 *
 */

// Transfer event signature: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const ZERO_ADDRESS_TOPIC = ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32);

const DEAD_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000001",
  "0x000000000000000000000000000000000000dead",
]);

export class BlockEventPoller {
  constructor(private provider: Provider) {}

  async getCurrentBlockNumber(): Promise<number> {
    const blockNumber = await this.provider.getBlockNumber();
    return blockNumber;
  }

  async getContractCreationsFromBlock(blockNumber: number): Promise<string[]> {
    try {
      const block = await this.provider.getBlock(blockNumber);

      if (!block) throw new TechnicalError("Couldn't get block for block number: " + blockNumber);

      const filterTopics = [TRANSFER_TOPIC, ZERO_ADDRESS_TOPIC];
      const filteredEvents: FilteredEthersEvent[] = await this.filterBlockEventsOnTopics(blockNumber, filterTopics);

      const transferEventInfos: TransferEventInfo[] = await this.convertToTransferEventInfos(filteredEvents);
      if (transferEventInfos.length === 0) return [];

      const validTransferEvents = this.filterTransferEventInfos(transferEventInfos);
      if (validTransferEvents.length === 0) return [];

      const createdContractAddresses = await this.filterContractCreations(validTransferEvents);
      if (createdContractAddresses.length === 0) return [];

      return createdContractAddresses;
    } catch (error) {
      console.error(`Error getting tokens from latest block: ${error}`);
      return [];
    }
  }

  private async filterBlockEventsOnTopics(blockNumber: number, filterTopics: string[]): Promise<FilteredEthersEvent[]> {
    return (await this.provider.getLogs({
      fromBlock: blockNumber,
      toBlock: blockNumber,
      topics: filterTopics,
    })) as FilteredEthersEvent[];
  }

  private async convertToTransferEventInfos(filteredEvents: FilteredEthersEvent[]): Promise<TransferEventInfo[]> {
    const transferEventInfos = filteredEvents.map((event) => this.convertEventTopics(event));
    return transferEventInfos;
  }

  private convertEventTopics(event: FilteredEthersEvent): TransferEventInfo {
    // Extract 'from' address from topics[1]
    const from = "0x" + event.topics[1].slice(26);

    // Extract 'to' address from topics[2]
    const to = "0x" + event.topics[2].slice(26);

    // Convert data to BigInt value, handling empty or "0x" cases
    let value = BigInt(0);
    if (event.data && event.data !== "0x") {
      const paddedData = event.data.length % 2 === 0 ? event.data : `${event.data}0`;
      value = BigInt(paddedData);
    }

    return {
      address: event.address,
      from,
      to,
      value,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
    };
  }

  private filterTransferEventInfos(events: TransferEventInfo[]): TransferEventInfo[] {
    // 1. Filter duplicate token addresses
    const uniqueTokens = events.filter(
      (event, index, self) => index === self.findIndex((e) => e.address === event.address),
    );

    // 2. Filter on transfer amounts
    const MIN_TRANSFER_AMOUNT = BigInt(0);
    const significantTransfers = uniqueTokens.filter((event) => event.value > MIN_TRANSFER_AMOUNT);

    // 3. Filter transfers to dead addresses
    const validTransferEvents = significantTransfers.filter((event) => !DEAD_ADDRESSES.has(event.to.toLowerCase()));

    // 4. Filter duplicate transactions (only keep first event per transaction)
    const uniqueTransactions = validTransferEvents.filter(
      (event, index, self) => index === self.findIndex((e) => e.transactionHash === event.transactionHash),
    );

    return uniqueTransactions;
  }

  private async filterContractCreations(events: TransferEventInfo[]): Promise<string[]> {
    const contractAddresses: string[] = [];
    for (const event of events) {
      const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
      if (!receipt) {
        console.log(`Couldn't get transaction receipt for ${event.transactionHash}`);
        continue;
      }

      if (receipt.contractAddress !== null) {
        contractAddresses.push(receipt.contractAddress);
      }
    }
    return contractAddresses;
  }
}
