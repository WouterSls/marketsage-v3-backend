export type TokenDiscoveryInfo = {
  running: boolean;
  statistics: {
    blocksScanned: number;
    contractsDiscovered: number;
    invalidContracts: number;
    validContracts: number;
    reverifyableContracts: number;
    lastScannedBlock: number;
  };
};
