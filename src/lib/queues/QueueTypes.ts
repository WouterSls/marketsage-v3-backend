export enum QueueNames {
  TOKEN_VALIDATION = "token-validation",
  TOKEN_MONITORING = "token-monitoring",
}

export interface TokenValidationItem {
  address: string;
}

export interface TokenMonitoringItem {
  address: string;
  lastMonitoredAt?: number;
  status?: string;
  monitorInterval?: number; // In milliseconds
}
