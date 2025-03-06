import { ethers } from "ethers";

import { LiquidityDto } from "./LiquidityDto";
import { AllProtocolsLiquidity } from "../../../token-security-validator/models/liquidity.types";

export class LiquidityMapper {
  public static toLiquidityDto(liquidity: AllProtocolsLiquidity): LiquidityDto {
    return {
      v2Liquidity: {
        exists: liquidity.v2Liquidity.exists,
        liquidityEth: ethers.formatEther(liquidity.v2Liquidity.liquidityEth),
        pairAddress: liquidity.v2Liquidity.pairAddress,
      },
      v3Liquidity: {
        exists: liquidity.v3Liquidity.exists,
        liquidityEth: ethers.formatEther(liquidity.v3Liquidity.liquidityEth),
        poolAddress: liquidity.v3Liquidity.poolAddress,
        feeTier: liquidity.v3Liquidity.feeTier / 10000,
      },
      v4Liquidity: {
        exists: liquidity.v4Liquidity.exists,
        liquidityEth: ethers.formatEther(liquidity.v4Liquidity.liquidityEth),
      },
      aerodromeLiquidity: {
        exists: liquidity.aerodromeLiquidity.exists,
        liquidityEth: ethers.formatEther(liquidity.aerodromeLiquidity.liquidityEth),
      },
    };
  }
}
