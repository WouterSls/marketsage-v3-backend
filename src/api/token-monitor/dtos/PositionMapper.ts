import { SelectPosition } from "../../../db/position/PositionRepository";
import { PositionDto } from "./PositionDto";

export class PositionMapper {
  public static toPositionDto(position: SelectPosition): PositionDto {
    return {
      id: position.id,
      tokenAddress: position.tokenAddress,
      tokenName: position.tokenName,
      averageEntryPriceUsd: position.averageEntryPriceUsd,
      currentProfitLossUsd: position.currentProfitLossUsd,
    };
  }
}
