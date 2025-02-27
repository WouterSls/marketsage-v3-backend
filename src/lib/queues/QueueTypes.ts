/**
 * Queue names used across the application
 */
export enum QueueNames {
  TOKEN_VALIDATION = "token-validation",
  TOKEN_MONITORING = "token-monitoring",
}

/**
 * Token for validation queue
 */
export interface TokenValidationItem {
  address: string;
  creatorAddress: string;
  blockNumber?: number;
  discoveredAt?: number;
}

/**
 * Token for monitoring queue
 */
export interface TokenMonitoringItem {
  address: string;
  lastMonitoredAt?: number;
  status?: string;
  monitorInterval?: number; // In milliseconds
}
