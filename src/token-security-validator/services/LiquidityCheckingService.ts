import { ethers, Provider } from "ethers";
import NodeCache from "node-cache";

import { ChainConfig } from "../../lib/blockchain/config/chain-config";

import { ActiveToken, DEX } from "../models/token-security-validator.types";
import { AllProtocolsLiquidity, LiquidityInfo, LiquidityInfoV3 } from "../models/liquidity.types";

import { SECURITY_VALIDATOR_CONFIG } from "../config/security-validator-config";

import { TechnicalError } from "../../lib/errors/TechnicalError";
import { SelectToken } from "../../db/token/TokenRepository";

export class LiquidityCheckingService {
  private WETH_ADDRESS: string | null = null;
  private UNI_V2_FACTORY_ADDRESS: string | null = null;
  private UNI_V3_FACTORY_ADDRESS: string | null = null;

  private readonly LIQUIDITY_THRESHOLD = ethers.parseEther(SECURITY_VALIDATOR_CONFIG.MIN_ETH_LIQUIDITY);
  private readonly RUGPULL_LIQUIDITY_THRESHOLD = (this.LIQUIDITY_THRESHOLD * 20n) / 100n;

  private readonly poolAddressCache = new NodeCache();

  constructor(
    private readonly provider: Provider,
    chainConfig: ChainConfig,
  ) {
    this.UNI_V2_FACTORY_ADDRESS = chainConfig.uniswapV2?.factoryAddress ?? null;
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth ?? null;
    this.UNI_V3_FACTORY_ADDRESS = chainConfig.uniswapV3?.factoryAddress ?? null;

    this.poolAddressCache = new NodeCache({
      stdTTL: 60 * 60, // 1 hour
      checkperiod: 60 * 60, // 1 hour
    });

    if (!this.UNI_V2_FACTORY_ADDRESS || !this.WETH_ADDRESS || !this.UNI_V3_FACTORY_ADDRESS) {
      throw new TechnicalError("Missing required addresses in chain config");
    }
  }

  async validateLiquidity(tokenOrAddress: ActiveToken | string): Promise<LiquidityInfo> {
    const tokenAddress = typeof tokenOrAddress === "string" ? tokenOrAddress : tokenOrAddress.address;

    const v2Liquidity = await this.checkV2Liquidity(tokenAddress);
    const v3Liquidity = await this.checkV3Liquidity(tokenAddress);
    const v4Liquidity = await this.checkV4Liquidity(tokenAddress);
    const aerodromeLiquidity = await this.checkAerodromeLiquidity(tokenAddress);

    let mostLiquidDex: DEX = null;
    let maxLiquidityETH = 0n;

    if (v2Liquidity.exists && v2Liquidity.liquidityEth) {
      const liquidityETH = BigInt(v2Liquidity.liquidityEth);
      console.log(`Uniswap V2 liquidity: ${ethers.formatEther(liquidityETH)} ETH`);

      if (liquidityETH > maxLiquidityETH && liquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = liquidityETH;
        mostLiquidDex = "uniswapv2";
      }
    }

    if (v3Liquidity.exists && v3Liquidity.liquidityEth) {
      console.log(`Uniswap V3 liquidity: ${ethers.formatEther(v3Liquidity.liquidityEth)} ETH`);
      const v3LiquidityETH = BigInt(v3Liquidity.liquidityEth);

      if (v3LiquidityETH > maxLiquidityETH && v3LiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = v3LiquidityETH;
        mostLiquidDex = "uniswapv3";
      }
    }

    if (v4Liquidity.exists && v4Liquidity.liquidityEth) {
      const v4LiquidityETH = BigInt(v4Liquidity.liquidityEth);
      console.log(`Uniswap V4 liquidity: ${ethers.formatEther(v4LiquidityETH)} ETH`);

      if (v4LiquidityETH > maxLiquidityETH && v4LiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = v4LiquidityETH;
        mostLiquidDex = "uniswapv4";
      }
    }

    if (aerodromeLiquidity.exists && aerodromeLiquidity.liquidityEth) {
      const aerodromeLiquidityETH = BigInt(aerodromeLiquidity.liquidityEth);
      console.log(`Aerodrome liquidity: ${ethers.formatEther(aerodromeLiquidityETH)} ETH`);

      if (aerodromeLiquidityETH > maxLiquidityETH && aerodromeLiquidityETH >= this.LIQUIDITY_THRESHOLD) {
        maxLiquidityETH = aerodromeLiquidityETH;
        mostLiquidDex = "aerodrome";
      }
    }

    if (mostLiquidDex) {
      console.log(`Most liquid dex: ${mostLiquidDex} (${ethers.formatEther(maxLiquidityETH)} ETH)`);

      if (typeof tokenOrAddress !== "string") {
        tokenOrAddress.hasLiquidity = true;
        tokenOrAddress.protocol = mostLiquidDex;
      }
    }

    return {
      hasLiquidity: !!mostLiquidDex,
      protocol: mostLiquidDex,
      liquidityETH: maxLiquidityETH.toString(),
    };
  }

  async rugpullCheck(token: ActiveToken | SelectToken) {
    const isActiveToken = "protocol" in token && "hasLiquidity" in token;

    try {
      if (isActiveToken) {
        const activeToken = token as ActiveToken;
        return await this.activeTokenRugpullCheck(activeToken);
      } else {
        const selectToken = token as SelectToken;
        return await this.selectTokenRugpullCheck(selectToken);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.toLowerCase().includes("insufficient_input_amount")) {
        console.log("rugp pull detection ");
        return { isRugpull: true };
      }
      console.error(`Error checking rugpull for token ${token.address}: ${errorMessage}`);
      return { isRugpull: false };
    }
  }
  private async activeTokenRugpullCheck(activeToken: ActiveToken) {
    if (!activeToken.hasLiquidity || !activeToken.protocol) {
      console.log(`Token ${activeToken.address} has no liquidity, skipping rugpull check`);
      return { isRugpull: false };
    }

    let liquidityETH: bigint = 0n;

    switch (activeToken.protocol) {
      case "uniswapv2":
        const v2Liquidity = await this.checkV2Liquidity(activeToken.address);
        console.log("v2Liquidity", v2Liquidity);
        liquidityETH = v2Liquidity.exists && v2Liquidity.liquidityEth ? BigInt(v2Liquidity.liquidityEth) : 0n;
        break;

      case "uniswapv3":
        const v3Liquidity = await this.checkV3Liquidity(activeToken.address);
        liquidityETH = v3Liquidity.exists && v3Liquidity.liquidityEth ? BigInt(v3Liquidity.liquidityEth) : 0n;
        break;

      case "uniswapv4":
        const v4Liquidity = await this.checkV4Liquidity(activeToken.address);
        liquidityETH = v4Liquidity.exists && v4Liquidity.liquidityEth ? BigInt(v4Liquidity.liquidityEth) : 0n;
        break;

      case "aerodrome":
        const aerodromeLiquidity = await this.checkAerodromeLiquidity(activeToken.address);
        liquidityETH =
          aerodromeLiquidity.exists && aerodromeLiquidity.liquidityEth ? BigInt(aerodromeLiquidity.liquidityEth) : 0n;
        break;

      default:
        console.warn(`Unknown protocol: ${activeToken.protocol}`);
        return { isRugpull: false };
    }

    const isRugpull = liquidityETH < this.RUGPULL_LIQUIDITY_THRESHOLD;

    console.log(`Token ${activeToken.address} rugpull check:
      - Liquidity: ${ethers.formatEther(liquidityETH)} ETH
      - Threshold: ${ethers.formatEther(this.RUGPULL_LIQUIDITY_THRESHOLD)} ETH
      - Rugpull: ${isRugpull ? "Yes" : "No"}`);

    return {
      isRugpull: isRugpull,
      liquidityETH: liquidityETH.toString(),
      threshold: this.RUGPULL_LIQUIDITY_THRESHOLD.toString(),
    };
  }
  private async selectTokenRugpullCheck(selectToken: SelectToken) {
    if (!selectToken.dex) {
      throw new TechnicalError("Validated token has no dex");
    }

    let liquidityETH: bigint = 0n;

    switch (selectToken.dex) {
      case "uniswapv2":
        const v2Liquidity = await this.checkV2Liquidity(selectToken.address);
        console.log("v2Liquidity", v2Liquidity);
        liquidityETH = v2Liquidity.exists && v2Liquidity.liquidityEth ? BigInt(v2Liquidity.liquidityEth) : 0n;
        break;

      case "uniswapv3":
        const v3Liquidity = await this.checkV3Liquidity(selectToken.address);
        liquidityETH = v3Liquidity.exists && v3Liquidity.liquidityEth ? BigInt(v3Liquidity.liquidityEth) : 0n;
        break;

      case "uniswapv4":
        const v4Liquidity = await this.checkV4Liquidity(selectToken.address);
        liquidityETH = v4Liquidity.exists && v4Liquidity.liquidityEth ? BigInt(v4Liquidity.liquidityEth) : 0n;
        break;

      case "aerodrome":
        const aerodromeLiquidity = await this.checkAerodromeLiquidity(selectToken.address);
        liquidityETH =
          aerodromeLiquidity.exists && aerodromeLiquidity.liquidityEth ? BigInt(aerodromeLiquidity.liquidityEth) : 0n;
        break;

      default:
        console.warn(`Unknown protocol: ${selectToken.dex}`);
        return { isRugpull: false };
    }

    const isRugpull = liquidityETH < this.RUGPULL_LIQUIDITY_THRESHOLD;

    console.log(`Token ${selectToken.address} rugpull check:
      - Liquidity: ${ethers.formatEther(liquidityETH)} ETH
      - Threshold: ${ethers.formatEther(this.RUGPULL_LIQUIDITY_THRESHOLD)} ETH
      - Protocol: ${selectToken.dex}
      - Rugpull: ${isRugpull ? "Yes" : "No"}`);

    return {
      isRugpull: isRugpull,
      liquidityETH: liquidityETH.toString(),
      threshold: this.RUGPULL_LIQUIDITY_THRESHOLD.toString(),
    };
  }

  async getLiquidity(tokenAddress: string): Promise<AllProtocolsLiquidity> {
    const v2Liquidity = await this.checkV2Liquidity(tokenAddress);
    const v3Liquidity = await this.checkV3Liquidity(tokenAddress);
    const v4Liquidity = await this.checkV4Liquidity(tokenAddress);
    const aerodromeLiquidity = await this.checkAerodromeLiquidity(tokenAddress);

    const liquidity = {
      v2Liquidity,
      v3Liquidity,
      v4Liquidity,
      aerodromeLiquidity,
    };

    return liquidity;
  }
  async getV3Liquidity(tokenAddress: string): Promise<LiquidityInfoV3> {
    return await this.checkV3Liquidity(tokenAddress);
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
        return { exists: false, liquidityTokens: "0", liquidityEth: "0", pairAddress: ethers.ZeroAddress };
      }

      const pairContract = new ethers.Contract(pairAddress, pairInterface, this.provider);
      const reserves = await pairContract.getReserves();

      const token0 = tokenAddress.toLowerCase() < this.WETH_ADDRESS!.toLowerCase() ? tokenAddress : this.WETH_ADDRESS;
      const [reserveToken, reserveETH] =
        token0 === tokenAddress ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

      const exists = reserveETH > this.LIQUIDITY_THRESHOLD;

      return {
        exists: exists,
        liquidityTokens: reserveToken.toString(),
        liquidityEth: reserveETH.toString(),
        pairAddress: pairAddress,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${tokenAddress} - ${errorMessage}`);
      return { exists: false, liquidityTokens: "0", liquidityEth: "0", pairAddress: ethers.ZeroAddress };
    }
  }

  private async checkV3Liquidity(tokenAddress: string): Promise<LiquidityInfoV3> {
    try {
      const bestPool: LiquidityInfoV3 = {
        exists: false,
        liquidityEth: "0",
        poolAddress: ethers.ZeroAddress,
        feeTier: 0,
      };

      const factoryInterface = new ethers.Interface([
        "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
      ]);
      const factoryContract = new ethers.Contract(this.UNI_V3_FACTORY_ADDRESS!, factoryInterface, this.provider);

      const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
      for (const feeTier of feeTiers) {
        const poolAddress = await this.getV3PoolAddress(factoryContract, tokenAddress, feeTier);
        if (!poolAddress) continue;

        const wethBalance = await this.getPoolWethBalance(poolAddress);
        if (wethBalance < this.LIQUIDITY_THRESHOLD) continue;

        const bestLiquidity = BigInt(bestPool.liquidityEth || "0");
        if (wethBalance > bestLiquidity) {
          bestPool.exists = true;
          bestPool.liquidityEth = wethBalance.toString();
          bestPool.poolAddress = poolAddress;
          bestPool.feeTier = feeTier;
        }
      }

      return bestPool;
    } catch (error) {
      console.error(
        `Error checking V3 liquidity for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        exists: false,
        liquidityEth: "0",
        poolAddress: ethers.ZeroAddress,
        feeTier: 0,
      };
    }
  }

  private async getV3PoolAddress(
    factoryContract: ethers.Contract,
    tokenAddress: string,
    feeTier: number,
  ): Promise<string | null> {
    const cacheKey = `pool_${tokenAddress.toLowerCase()}_${this.WETH_ADDRESS!.toLowerCase()}_${feeTier}`;

    let poolAddress = this.poolAddressCache.get<string>(cacheKey);
    if (poolAddress !== undefined) return poolAddress;

    try {
      poolAddress = await factoryContract.getPool(tokenAddress, this.WETH_ADDRESS, feeTier);
      if (poolAddress === ethers.ZeroAddress || poolAddress === undefined) {
        return null;
      }
      this.poolAddressCache.set(cacheKey, poolAddress);
      return poolAddress;
    } catch (error) {
      console.warn(`Failed to get V3 pool for token ${tokenAddress} with fee ${feeTier}`);
      return null;
    }
  }
  private async getPoolWethBalance(poolAddress: string): Promise<bigint> {
    try {
      const erc20Interface = new ethers.Interface(["function balanceOf(address) view returns (uint256)"]);
      const wethContract = new ethers.Contract(this.WETH_ADDRESS!, erc20Interface, this.provider);
      return await wethContract.balanceOf(poolAddress);
    } catch (error) {
      console.warn(`Error getting WETH balance for pool ${poolAddress}:`, error);
      return 0n;
    }
  }

  private async checkV4Liquidity(tokenAddress: string) {
    return {
      exists: false,
      liquidityEth: "0",
    };
  }

  private async checkAerodromeLiquidity(tokenAddress: string) {
    return {
      exists: false,
      liquidityEth: "0",
    };
  }
}
