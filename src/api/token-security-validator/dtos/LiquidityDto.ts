export interface LiquidityDto {
  v2Liquidity: {
    exists: boolean;
    liquidityEth: string;
    pairAddress: string;
  };
  v3Liquidity: {
    exists: boolean;
    liquidityEth: string;
    poolAddress: string;
    feeTier: number;
  };
  v4Liquidity: {
    exists: boolean;
    liquidityEth: string;
  };
  aerodromeLiquidity: {
    exists: boolean;
    liquidityEth: string;
  };
}
