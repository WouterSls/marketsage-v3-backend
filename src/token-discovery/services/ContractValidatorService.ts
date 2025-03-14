import { ethers, Provider } from "ethers";

import { IBlockExplorerClient } from "../interfaces/IBlockExplorerClient";
import { BasescanApi } from "./BasescanApi";

import {
  SecurityCheckResult,
  ACCESS_CONTROL_PATTERNS,
  TRADING_RESTRICTION_PATTERNS,
  PRIVILEGED_CONTROL_PATTERNS,
  FEE_PATTERNS,
  MODIFIABLE_TOKENOMICS_PATTERNS,
  MINT_PATTERNS,
  SUSPICIOUS_NAMES,
  ValidationResult,
} from "../models/contract-validator.types";

import { ContractValidatorError } from "../../lib/errors/ContractValidatorError";
import { MINIMAL_ERC20_ABI } from "../../lib/blockchain/contract-abis/contract-abis";

export class ContractValidatorService {
  private blockExplorerClient: IBlockExplorerClient;

  constructor(
    private provider: Provider,
    apiKey: string,
  ) {
    this.blockExplorerClient = new BasescanApi(apiKey);
  }

  public async validateContract(address: string): Promise<ValidationResult> {
    try {
      const { isVerified, functionNames } = await this.blockExplorerClient.getVerifiedAbi(address);
      if (!isVerified) {
        return { isVerified: false, isValid: false };
      }

      const { isMinimalERC20 } = this.hasMinimalERC20Functions(functionNames);
      if (!isMinimalERC20) {
        return { isVerified: true, isValid: false };
      }

      console.log(`Token functions: ${JSON.stringify(functionNames, null, 2)}`);

      const { isValid } = await this.basicContractValidation(address, functionNames);
      if (!isValid) {
        return { isVerified: true, isValid: false };
      }

      const creatorAddress = await this.blockExplorerClient.getContractCreator(address);

      return { isVerified: true, isValid: true, creatorAddress };
    } catch (error) {
      console.error(`Error validating contract ${address}`, error);
      return { isVerified: false, isValid: false };
    }
  }

  private hasMinimalERC20Functions(functionNames: string[]): { isMinimalERC20: boolean } {
    const requiredFunctions = ["name", "symbol", "decimals", "totalSupply", "balanceOf", "transfer"];
    const isMinimalERC20 = requiredFunctions.every((func) => functionNames.includes(func));
    return { isMinimalERC20 };
  }

  private async basicContractValidation(address: string, functionNames: string[]): Promise<{ isValid: boolean }> {
    try {
      const token = new ethers.Contract(address, MINIMAL_ERC20_ABI, this.provider);
      const name = await token.name();

      const isRiskyContract = await this.riskyContractValidation(name, functionNames);
      if (isRiskyContract) {
        console.log(`${name} (${address}) - is a risky contract`);
        return { isValid: false };
      }

      console.log(`Token name: ${name}`);
      return { isValid: true };
    } catch (error) {
      console.error(`Failed to create ERC20 instance for ${address}`, error);
      return { isValid: false };
    }
  }

  /**
   *
   * RISKY CONTRACT VALIDATION
   *
   */
  private async riskyContractValidation(tokenName: string, functionNames: string[]): Promise<boolean> {
    const functionCheckResult: SecurityCheckResult = this.checkContractFunctions(functionNames);
    const isRiskyContract = this.evaluateHoneypotRisk(functionCheckResult.riskFactors);

    const isRiskyName = this.checkContractName(tokenName);

    return isRiskyContract || isRiskyName;
  }

  private checkContractFunctions(functionNames: string[]): SecurityCheckResult {
    const result: SecurityCheckResult = {
      isHoneypot: false,
      riskFactors: {
        hasAccessControls: false,
        hasPrivilegedControls: false,
        hasTradingRestrictions: false,
        hasFees: false,
        hasModifiableTokenomics: false,
        hasMintFunctions: false,
      },
      details: {},
    };

    try {
      const accessControlFunctions = this.findMatchingFunctions(functionNames, ACCESS_CONTROL_PATTERNS);
      if (accessControlFunctions.length > 0) {
        result.riskFactors.hasAccessControls = true;
        result.details.accessControlFunctions = accessControlFunctions;
      }

      const privilegedControlFunctions = this.findMatchingFunctions(functionNames, PRIVILEGED_CONTROL_PATTERNS);
      if (privilegedControlFunctions.length > 0) {
        result.riskFactors.hasPrivilegedControls = true;
        result.details.privilegedControlFunctions = privilegedControlFunctions;
      }

      const tradingRestrictionFunctions = this.findMatchingFunctions(functionNames, TRADING_RESTRICTION_PATTERNS);
      if (tradingRestrictionFunctions.length > 0) {
        result.riskFactors.hasTradingRestrictions = true;
        result.details.tradingRestrictionFunctions = tradingRestrictionFunctions;
      }

      const feeFunctions = this.findMatchingFunctions(functionNames, FEE_PATTERNS);
      if (feeFunctions.length > 0) {
        result.riskFactors.hasFees = true;
        result.details.feeFunctions = feeFunctions;
      }

      const modifiableTokenomics = this.findMatchingFunctions(functionNames, MODIFIABLE_TOKENOMICS_PATTERNS);
      if (modifiableTokenomics.length > 0) {
        result.riskFactors.hasModifiableTokenomics = true;
        result.details.modifiableTokenomics = modifiableTokenomics;
      }

      const mintFunctions = this.findMatchingFunctions(functionNames, MINT_PATTERNS);
      if (mintFunctions.length > 0) {
        result.riskFactors.hasMintFunctions = true;
        result.details.mintFunctions = mintFunctions;
      }

      result.isHoneypot = this.evaluateHoneypotRisk(result.riskFactors);
    } catch (error: any) {
      throw new ContractValidatorError(`Security check failed: ${error.message}`);
    }

    return result;
  }
  private evaluateHoneypotRisk(riskFactors: SecurityCheckResult["riskFactors"]): boolean {
    let riskScore = 0;

    // Critical risk factors (strongest indicators of potential honeypot)
    if (riskFactors.hasTradingRestrictions) riskScore += 3;
    if (riskFactors.hasAccessControls) riskScore += 3;

    // High risk factors
    if (riskFactors.hasFees) riskScore += 2;
    if (riskFactors.hasPrivilegedControls) riskScore += 2;

    // Medium risk factors
    if (riskFactors.hasModifiableTokenomics) riskScore += 1.5;
    if (riskFactors.hasMintFunctions) riskScore += 1.5;

    // Consider it a likely honeypot if risk score is high enough
    return riskScore >= 6;
  }

  private checkContractName(tokenName: string): boolean {
    //TODO: add suspicious token db integration | async?
    const hasSuspiciousName = SUSPICIOUS_NAMES.some((name) => tokenName.toLowerCase().includes(name));
    return hasSuspiciousName;
  }

  private findMatchingFunctions(functionNames: string[], patterns: readonly string[]): string[] {
    return functionNames.filter((name) =>
      patterns.some((pattern) => name.toLowerCase().includes(pattern.toLowerCase())),
    );
  }
}
