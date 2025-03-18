import { ethers, Provider, Wallet } from "ethers";

import { MINIMAL_ERC20_ABI } from "../contract-abis/contract-abis";
import { ERC20 } from "../models/Erc20";

import { Erc20Error } from "../../errors/Erc20Error";
import { TechnicalError } from "../../errors/TechnicalError";

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

export function extractRawTokenOutputFromLogs(logs: any, token: ERC20): bigint {
  const transferEvent = logs.find((log: any) => log.address.toLowerCase() === token.getTokenAddress().toLowerCase());
  const rawReceivedTokenAmount = transferEvent ? transferEvent.data : "Unknown";
  return rawReceivedTokenAmount;
}

export async function approveTokenSpending(wallet: Wallet, token: ERC20, spenderAddress: string, rawAmount: bigint) {
  const approveTxRequest = await token.createApproveTransaction(spenderAddress, rawAmount);
  const populatedApproveTransaction = await wallet.populateTransaction(approveTxRequest);
  const approveTxResponse = await wallet.sendTransaction(populatedApproveTransaction);
  const approveTxReceipt = await approveTxResponse.wait();

  if (!approveTxReceipt) throw new TechnicalError("Failed to approve token spending | no transaction receipt");
  const gasCost = approveTxReceipt.gasPrice * approveTxReceipt.gasUsed;

  const gasCostFormatted = ethers.formatEther(gasCost);
  return gasCostFormatted;
}

export function calculateSlippageAmount(rawAmount: bigint, slippageTolerance: number) {
  const slippageMultiplier = slippageTolerance * 100;
  const slippageAmount = (rawAmount * BigInt(slippageMultiplier)) / 100n;
  return slippageAmount;
}

export function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length <= 1 || tokens.length !== fees.length + 1) {
    throw new TechnicalError("Invalid tokens or fees length for path encoding");
  }

  let encoded = "0x";
  for (let i = 0; i < tokens.length - 1; i++) {
    encoded += tokens[i].slice(2);
    encoded += fees[i].toString(16).padStart(6, "0");
  }
  encoded += tokens[tokens.length - 1].slice(2);

  return encoded;
}
