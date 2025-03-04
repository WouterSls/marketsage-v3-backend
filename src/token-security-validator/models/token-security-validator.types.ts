import { ERC20 } from "../../lib/blockchain/models/erc20";

export interface ActiveToken {
  address: string;
  creatorAddress: string;
  addedAt: number;
  expiresAt: number;
  hasBalance: boolean;
  hasLiquidity: boolean;
  protocol: DEX;
  erc20: ERC20;
  isBeingProcessed: boolean;
}

export type DEX = "uniV2" | "uniV3" | "uniV4" | "aerodrome" | "balancer" | null;

export interface LiquidityInfo {
  hasLiquidity: boolean;
  protocol: DEX;
  liquidityETH: string;
}
