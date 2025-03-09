export type TokenDiscoveryInfo = {
  running: boolean;
  statistics: {
    blocksScanned: number;
    contractsDiscovered: number;
    reverifyableContracts: number;
    tokensValidated: number;
    lastScannedBlock: number;
  };
};
