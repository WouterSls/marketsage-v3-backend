export enum QueueNames {
  TOKEN_VALIDATION = "token-validation",
  TOKEN_MONITORING = "token-monitoring",
}

export interface TokenValidationItem {
  address: string;
  creatorAddress: string;
  discoveredAt: number;
}

export interface TokenMonitoringItem {
  address: string;
  lastMonitoredAt?: number;
  status?: string;
  monitorInterval?: number; // In milliseconds
}
