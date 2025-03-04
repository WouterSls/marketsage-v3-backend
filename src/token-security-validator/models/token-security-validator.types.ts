import { ERC20 } from "../../lib/blockchain/models/erc20";

export interface ActiveToken {
  address: string;
  creatorAddress: string;
  addedAt: number;
  expiresAt: number;
  hasBalance: boolean;
  hasLiquidity: boolean;
  erc20: ERC20;
}
