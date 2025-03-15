import { TokenStatus } from "../../../lib/db/schema";

export interface TokenDto {
  name: string;
  address: string;
  creatorAddress: string;
  status: TokenStatus;
  isSuspicious: boolean;
  discoveredAt: number;
}
