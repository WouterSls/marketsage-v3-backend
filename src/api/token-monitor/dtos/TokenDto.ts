import { TokenStatus, DexType } from "../../../lib/db/schema";

export interface TokenDto {
  name: string;
  address: string;
  creatorAddress: string;
  status: TokenStatus;
  dex: DexType;
  isSuspicious: boolean;
  discoveredAt: number;
}
