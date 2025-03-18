import { DEX } from "./token-security-validator.types";

export interface LiquidityInfo {
  hasLiquidity: boolean;
  protocol: DEX;
  liquidityETH: string;
}

export interface LiquidityInfoV3 {
  exists: boolean;
  liquidityEth: string;
  tick: string;
  poolAddress: string;
  feeTier: number;
}

export interface AllProtocolsLiquidity {
  v2Liquidity: {
    exists: boolean;
    liquidityTokens: string;
    liquidityEth: string;
    pairAddress: string;
  };
  v3Liquidity: {
    exists: boolean;
    liquidityEth: string;
    tick: string;
    poolAddress: string;
    feeTier: number;
  };
  v4Liquidity: {
    exists: boolean;
    liquidityEth: string;
    tick: string;
  };
  aerodromeLiquidity: {
    exists: boolean;
    liquidityEth: string;
    tick: string;
  };
}
