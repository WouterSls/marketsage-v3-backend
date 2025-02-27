export interface FilteredEthersEvent {
  address: string;
  topics: readonly string[];
  data: string;
  transactionHash: string;
  blockNumber: number;
}

export interface TransferEventInfo {
  address: string; // address that emitted the event
  to: string; // address that received the tokens
  from: string; // address that sent the tokens
  value: bigint; // amount of tokens transferred
  transactionHash: string; // hash of the transaction that emitted the event
  blockNumber: number; // block number of the block that contains the transaction
}
