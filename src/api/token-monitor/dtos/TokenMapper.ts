import { SelectToken } from "../../../db/token/TokenRepository";
import { TokenDto } from "./TokenDto";

export class TokenMapper {
  public static toTokenDto(token: SelectToken): TokenDto {
    return {
      name: token.name,
      address: token.address,
      creatorAddress: token.creatorAddress,
      isSuspicious: token.isSuspicious,
      discoveredAt: token.discoveredAt,
    };
  }
}
