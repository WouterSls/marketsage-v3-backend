export interface ITokenDiscoveryService {
  initialize(): Promise<void>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
  getStatistics(): {
    blocksScanned: number;
    contractsDiscovered: number;
    tokensValidated: number;
    lastScannedBlock: number;
  };
}
