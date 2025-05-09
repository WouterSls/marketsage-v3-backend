import { ERC20 } from "../../lib/blockchain/models/Erc20";
import { DexType } from "../../lib/db/schema";

export interface ActiveToken {
  address: string;
  creatorAddress: string;
  addedAt: number;
  expiresAt: number;
  hasLiquidity: boolean;
  protocol: DEX;
  erc20: ERC20;
  isBeingProcessed: boolean;
}

export type DEX = DexType;

export type TokenSecurityValidatorStatistics = {
  activeTokenCount: number;
  rugpullCount: number;
  tokensCreated: number;
};
