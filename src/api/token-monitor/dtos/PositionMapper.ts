import { SelectPosition } from "../../../db/index";
import { PositionDto } from "./PositionDto";

export class PositionMapper {
  public static toPositionDto(position: SelectPosition): PositionDto {
    return {
      tokenAddress: position.tokenAddress,
      tokenName: position.tokenName,
      averageEntryPriceUsd: position.averageEntryPriceUsd,
      averageExitPriceUsd: position.averageExitPriceUsd,
      currentProfitLossUsd: position.currentProfitLossUsd,
    };
  }
}
