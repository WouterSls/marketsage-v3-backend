import { SelectToken } from "../../../db/token/TokenRepository";
import { TokenDto } from "./TokenDto";

export class TokenMapper {
  public static toTokenDto(token: SelectToken): TokenDto {
    return {
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      creatorAddress: token.creatorAddress,
      status: token.status,
      dex: token.dex,
      isSuspicious: token.isSuspicious,
      discoveredAt: token.discoveredAt,
    };
  }
}
