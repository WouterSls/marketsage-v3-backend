export type TokenDiscoveryStatistics = {
  blocksScanned: number;
  contractsDiscovered: number;
  invalidContracts: number;
  validContracts: number;
  reverifyableContracts: number;
  lastScannedBlock: number;
};
