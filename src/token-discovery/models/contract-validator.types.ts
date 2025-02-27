export interface ValidationResult {
  isValid: boolean;
  address?: string;
  creatorAddress?: string;
}

export interface SecurityCheckResult {
  isHoneypot: boolean;
  riskFactors: {
    hasAccessControls: boolean;
    hasPrivilegedControls: boolean;
    hasTradingRestrictions: boolean;
    hasFees: boolean;
    hasModifiableTokenomics: boolean;
    hasMintFunctions: boolean;
  };
  details: {
    accessControlFunctions?: string[];
    privilegedControlFunctions?: string[];
    tradingRestrictionFunctions?: string[];
    feeFunctions?: string[];
    modifiableTokenomics?: string[];
    mintFunctions?: string[];
  };
}
export const ACCESS_CONTROL_PATTERNS: readonly string[] = [
  // Blacklist related
  "blacklist",
  "blocklist",
  "denylist",
  "ban",
  "block",
  "exclude",
  "remove",
  "deny",
  "restrict",
  "revoke",
  "freeze",
  // Whitelist related
  "whitelist",
  "allowlist",
  "authorized",
  "permitted",
  // General access control
  "blocked",
  "banned",
  "frozen",
  "restricted",
  "addMultipleToWhitelist",
  "addToList",
  "removeFromList",
];

// Combined owner and privileged control patterns
export const PRIVILEGED_CONTROL_PATTERNS: readonly string[] = [
  // Owner related
  "_owner",
  "owner",
  "setOwner",
  "transferOwnership",
  "renounceOwnership",
  // Admin roles
  "admin",
  "operator",
  "governor",
  "controller",
  "manager",
  "master",
  "supervisor",
  "authority",
  "executor",
  "moderator",
  // Additional privileged roles
  "keeper",
  "proxy",
  "delegate",
] as const;

// Combined trading restrictions and max tx patterns
export const TRADING_RESTRICTION_PATTERNS: readonly string[] = [
  // Max transaction related
  "maxTransaction",
  "maxTransfer",
  "maxAmount",
  "maxTx",
  "maxSell",
  "maxBuy",
  "maxTrade",
  "maxSwap",
  "maxHold",
  "maxWallet",
  "maxBalance",
  // Limit related
  "limitTransaction",
  "limitTransfer",
  "limitTrade",
  "limitSell",
  "limitBuy",
  // Trading state
  "tradingEnabled",
  "tradingActive",
  "openTrading",
  "canTrade",
  "cooldown",
  "timelock",
  "pause",
  "frozen",
] as const;

export const FEE_PATTERNS: readonly string[] = [
  "fee",
  "tax",
  "charge",
  "commission",
  "royalty",
  "toll",
  "levy",
  "tariff",
  "setFee",
  "setTax",
  "updateFee",
  "updateTax",
] as const;

export const MODIFIABLE_TOKENOMICS_PATTERNS: readonly string[] = [
  // General modification
  "set",
  "change",
  "update",
  "modify",
  "adjust",
  "configure",
  // Specific tokenomics
  "setRate",
  "setLimit",
  "setMax",
  "setMin",
  "updateRate",
  "updateLimit",
  "updateMax",
  "updateMin",
  // Trading controls
  "enable",
  "disable",
  "toggleTrade",
  "toggleTransfer",
] as const;

export const MINT_PATTERNS: readonly string[] = [
  // Basic minting
  "mint",
  "_mint",
  "mintTo",
  "mintFor",
  // Alternative terms
  "create",
  "generate",
  "issue",
  "forge",
  "spawn",
  "produce",
  // Batch operations
  "massCreate",
  "bulkMint",
] as const;

export const SUSPICIOUS_NAMES: readonly string[] = [
  "trump",
  "elon",
  "melania",
  "pudgy",
  "deepseek",
  "vine",
  "deep seek",
  "mr beast",
  "deep16seek",
  "milk road",
  "MediaTek",
  "deepai",
  "postiz",
  "ai rig complex",
  "ai rig",
  "healthsci.ai",
  "pumpkin",
  "fartcoin",
  "rig",
  "ratomilton",
  "savings usds",
  "history hyenas coin",
  "usds stablecoin",
  "sony127g",
  "alpha",
  "chromia",
  "1stwinner",
  "safemoon",
] as const;
