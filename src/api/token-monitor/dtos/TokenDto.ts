import { TokenStatus, DexType } from "../../../lib/db/schema";

export interface TokenDto {
  name: string;
  symbol: string;
  address: string;
  creatorAddress: string;
  status: TokenStatus;
  dex: DexType;
  isSuspicious: boolean;
  discoveredAt: number;
  updatedAt: number;
}
