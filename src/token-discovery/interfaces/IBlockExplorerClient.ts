import { GetAbiResult } from "../models/block-explorer.types";

export interface IBlockExplorerClient {
  getVerifiedAbi(contractAddress: string): Promise<GetAbiResult>;
  getContractCreator(contractAddress: string): Promise<string>;
}
