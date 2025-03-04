import { ethers, Provider } from "ethers";

import { ChainConfig } from "../../lib/blockchain/models/chain-config";

import { ActiveToken, DEX, LiquidityInfo } from "../models/token-security-validator.types";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";

import { TechnicalError } from "../../lib/errors/TechnicalError";
import { SelectToken } from "../../db/token/TokenRepository";
export class LiquidityCheckingService {
  private WETH_ADDRESS: string | null = null;
  private UNI_V2_FACTORY_ADDRESS: string | null = null;
  private UNI_V3_FACTORY_ADDRESS: string | null = null;

  private readonly LIQUIDITY_THRESHOLD = ethers.parseEther(SECURITY_VALIDATOR_CONFIG.MIN_ETH_LIQUIDITY);
  private readonly RUGPULL_LIQUIDITY_THRESHOLD = (this.LIQUIDITY_THRESHOLD * 50n) / 100n;

  constructor(
    private readonly provider: Provider,
    chainConfig: ChainConfig,
  ) {
    this.UNI_V2_FACTORY_ADDRESS = chainConfig.uniswapV2?.factoryAddress ?? null;
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth ?? null;
    this.UNI_V3_FACTORY_ADDRESS = chainConfig.uniswapV3?.factoryAddress ?? null;

    if (!this.UNI_V2_FACTORY_ADDRESS || !this.WETH_ADDRESS || !this.UNI_V3_FACTORY_ADDRESS) {
      throw new TechnicalError("Missing required addresses in chain config");
    }
  }

  async validateInitialLiquidity(activeToken: ActiveToken): Promise<LiquidityInfo> {
    const v2Liquidity = await this.checkV2Liquidity(activeToken.address);
    const v3Liquidity = await this.checkV3Liquidity(activeToken.address);
    const v4Liquidity = await this.checkV4Liquidity(activeToken.address);
    const aerodromeLiquidity = await this.checkAerodromeLiquidity(activeToken.address);

    let mostLiquidDex: DEX = null;
    let maxLiquidityETH = 0n;

    if (v2Liquidity.exists && v2Liquidity.liquidityETH) {
      const liquidityETH = BigInt(v2Liquidity.liquidityETH);
      console.log(`Uniswap V2 liquidity: ${ethers.formatEther(liquidityETH)} ETH`);

      if (liquidityETH > maxLiquidityETH && liquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = liquidityETH;
        mostLiquidDex = "uniV2";
      }
    }

    if (v3Liquidity.exists && v3Liquidity.liquidity) {
      console.log(`Uniswap V3 liquidity: ${ethers.formatEther(v3Liquidity.liquidity)} ETH`);

      const v3LiquidityETH = BigInt(v3Liquidity.liquidity);

      if (v3LiquidityETH > maxLiquidityETH && v3LiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = v3LiquidityETH;
        mostLiquidDex = "uniV3";
      }
    }

    if (v4Liquidity.exists && v4Liquidity.liquidity) {
      const v4LiquidityETH = BigInt(v4Liquidity.liquidity);
      console.log(`Uniswap V4 liquidity: ${ethers.formatEther(v4LiquidityETH)} ETH`);

      if (v4LiquidityETH > maxLiquidityETH && v4LiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = v4LiquidityETH;
        mostLiquidDex = "uniV4";
      }
    }

    if (aerodromeLiquidity.exists && aerodromeLiquidity.liquidity) {
      const aerodromeLiquidityETH = BigInt(aerodromeLiquidity.liquidity);
      console.log(`Aerodrome liquidity: ${ethers.formatEther(aerodromeLiquidityETH)} ETH`);

      if (aerodromeLiquidityETH > maxLiquidityETH && aerodromeLiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = aerodromeLiquidityETH;
        mostLiquidDex = "aerodrome";
      }
    }

    if (mostLiquidDex) {
      activeToken.hasLiquidity = true;
      activeToken.protocol = mostLiquidDex;
    }

    return {
      hasLiquidity: activeToken.hasLiquidity,
      protocol: activeToken.protocol,
      liquidityETH: maxLiquidityETH.toString(),
    };
  }

  async rugpullCheck(token: ActiveToken | SelectToken) {
    const isActiveToken = "protocol" in token && "hasLiquidity" in token;

    if (isActiveToken) {
      const activeToken = token as ActiveToken;

      // If token doesn't have liquidity, can't be a rugpull
      if (!activeToken.hasLiquidity || !activeToken.protocol) {
        console.log(`Token ${activeToken.address} has no liquidity, skipping rugpull check`);
        return { rugpullRisk: false };
      }

      // Get liquidity based on the protocol
      let liquidityETH: bigint = 0n;

      switch (activeToken.protocol) {
        case "uniV2":
          const v2Liquidity = await this.checkV2Liquidity(activeToken.address);
          liquidityETH = v2Liquidity.exists && v2Liquidity.liquidityETH ? BigInt(v2Liquidity.liquidityETH) : 0n;
          break;

        case "uniV3":
          const v3Liquidity = await this.checkV3Liquidity(activeToken.address);
          liquidityETH = v3Liquidity.exists && v3Liquidity.liquidity ? BigInt(v3Liquidity.liquidity) : 0n;
          break;

        case "uniV4":
          const v4Liquidity = await this.checkV4Liquidity(activeToken.address);
          liquidityETH = v4Liquidity.exists && v4Liquidity.liquidity ? BigInt(v4Liquidity.liquidity) : 0n;
          break;

        case "aerodrome":
          const aerodromeLiquidity = await this.checkAerodromeLiquidity(activeToken.address);
          liquidityETH =
            aerodromeLiquidity.exists && aerodromeLiquidity.liquidity ? BigInt(aerodromeLiquidity.liquidity) : 0n;
          break;

        default:
          console.warn(`Unknown protocol: ${activeToken.protocol}`);
          return { rugpullRisk: false };
      }

      const hasRugpullRisk = liquidityETH < this.RUGPULL_LIQUIDITY_THRESHOLD;

      console.log(`Token ${activeToken.address} rugpull check:
      - Liquidity: ${ethers.formatEther(liquidityETH)} ETH
      - Threshold: ${ethers.formatEther(this.RUGPULL_LIQUIDITY_THRESHOLD)} ETH
      - Rugpull risk: ${hasRugpullRisk}`);

      return {
        rugpullRisk: hasRugpullRisk,
        liquidityETH: liquidityETH.toString(),
        threshold: this.RUGPULL_LIQUIDITY_THRESHOLD.toString(),
      };
    } else {
      // Placeholder for SelectToken
      console.log(`Performing SelectToken rugpull check for ${(token as SelectToken).address}`);

      // TODO: Implement SelectToken rugpull check
      // For example, you could check the token's history, trading volume, etc.

      return {
        rugpullRisk: false,
        message: "SelectToken rugpull check not fully implemented",
      };
    }
  }

  private async checkV2Liquidity(tokenAddress: string) {
    try {
      const factoryInterface = new ethers.Interface([
        "function getPair(address tokenA, address tokenB) view returns (address pair)",
      ]);
      const pairInterface = new ethers.Interface([
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      ]);

      const factoryContract = new ethers.Contract(this.UNI_V2_FACTORY_ADDRESS!, factoryInterface, this.provider);

      const pairAddress = await factoryContract.getPair(tokenAddress, this.WETH_ADDRESS);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        return { exists: false };
      }

      const pairContract = new ethers.Contract(pairAddress, pairInterface, this.provider);
      const reserves = await pairContract.getReserves();

      // Determine token order
      const token0 = tokenAddress.toLowerCase() < this.WETH_ADDRESS!.toLowerCase() ? tokenAddress : this.WETH_ADDRESS;
      const [reserveToken, reserveETH] =
        token0 === tokenAddress ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

      return {
        exists: true,
        liquidityTokens: reserveToken.toString(),
        liquidityETH: reserveETH.toString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${tokenAddress} - ${errorMessage}`);
      return { exists: false };
    }
  }

  private async checkV3Liquidity(tokenAddress: string) {
    try {
      const factoryInterface = new ethers.Interface([
        "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
      ]);

      const factoryContract = new ethers.Contract(this.UNI_V3_FACTORY_ADDRESS!, factoryInterface, this.provider);

      const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
      let bestPool = {
        exists: false,
        liquidity: "0",
        tick: 0,
        poolAddress: ethers.ZeroAddress,
        feeTier: 0,
      };

      for (const feeTier of feeTiers) {
        try {
          let poolAddress = null;
          try {
            poolAddress = await factoryContract.getPool(tokenAddress, this.WETH_ADDRESS, feeTier);
          } catch (error) {
            continue;
          }

          if (poolAddress !== ethers.ZeroAddress) {
            const poolInfo = await this.checkV3Pool(poolAddress, feeTier);
            const currentLiquidity = BigInt(poolInfo.liquidity || "0");
            const bestLiquidity = BigInt(bestPool.liquidity || "0");

            if (poolInfo.exists && currentLiquidity > bestLiquidity) {
              bestPool = poolInfo;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`${tokenAddress} - ${errorMessage}`);
          continue;
        }
      }

      return {
        exists: bestPool.exists,
        liquidity: bestPool.liquidity,
        tick: bestPool.tick.toString(),
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${tokenAddress} - ${errorMessage}`);
      return { exists: false };
    }
  }
  private async checkV3Pool(poolAddress: string, feeTier: number) {
    try {
      const poolInterface = new ethers.Interface([
        "function liquidity() view returns (uint128)",
        "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function token0() view returns (address)",
        "function token1() view returns (address)",
      ]);

      const erc20Interface = new ethers.Interface(["function balanceOf(address) view returns (uint256)"]);

      const poolContract = new ethers.Contract(poolAddress, poolInterface, this.provider);
      const [token0Address, token1Address, slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.slot0(),
      ]);

      if (slot0.sqrtPriceX96 === 0n) {
        return {
          exists: false,
          liquidity: "0",
          tick: 0,
          poolAddress,
          feeTier,
        };
      }

      const wethAddress = this.WETH_ADDRESS!.toLowerCase();
      const isToken0WETH = token0Address.toLowerCase() === wethAddress;
      const wethTokenAddress = isToken0WETH ? token0Address : token1Address;

      const wethContract = new ethers.Contract(wethTokenAddress, erc20Interface, this.provider);
      const wethBalance = await wethContract.balanceOf(poolAddress);

      return {
        exists: true,
        liquidity: wethBalance.toString(),
        tick: slot0.tick,
        poolAddress,
        feeTier,
      };
    } catch (error) {
      console.warn(`Error checking V3 liquidity for pool ${poolAddress}:`, error);
      return {
        exists: false,
        liquidity: "0",
        tick: 0,
        poolAddress,
        feeTier,
      };
    }
  }

  private async checkV4Liquidity(tokenAddress: string) {
    return {
      exists: false,
      liquidity: "0",
      tick: "0",
    };
  }

  private async checkAerodromeLiquidity(tokenAddress: string) {
    return {
      exists: false,
      liquidity: "0",
      tick: "0",
    };
  }
}
