import { ethers, Provider } from "ethers";

import { MINIMAL_ERC20_ABI } from "../contract-abis/contract-abis";
import { ERC20 } from "../models/erc20";

import { Erc20Error } from "../../errors/Erc20Error";

export async function createMinimalErc20(address: string, provider: Provider): Promise<ERC20> {
  const contract = new ethers.Contract(address, MINIMAL_ERC20_ABI, provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name().catch(() => "Not a token"),
    contract.symbol().catch(() => "Unknown"),
    contract.decimals().catch(() => 18),
    contract.totalSupply().catch(() => "0"),
  ]);

  if (name === "Not a token" || symbol === "Unknown" || totalSupply === "0") {
    throw new Erc20Error("Not an ERC20");
  }
  const numberDecimals = Number(decimals);

  const totalSupplyNumber = ethers.formatUnits(totalSupply, numberDecimals);

  return new ERC20(name, symbol, address, numberDecimals, totalSupplyNumber, contract);
}
