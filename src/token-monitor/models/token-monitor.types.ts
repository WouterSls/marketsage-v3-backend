export type TokenMonitorStatistics = {
  allMonitoringCount: number;
  activeMonitoringCount: number;
  rugpullCount: number;
  honeypotCount: number;
};

export type HoneypotCheckResult = {
  isHoneypot: boolean;
  reason: HoneypotReason;
};

export enum HoneypotReason {
  VALIDATED = "Token is validated",
  SAFE = "No honeypot detected",
  NOT_IMPLEMENTED = "Feature not implemented",
  BUY_FAILED = "Test buy failed",
  NO_TOKENS = "No tokens received",
  SELL_FAILED = "Sell simulation failed",
}
