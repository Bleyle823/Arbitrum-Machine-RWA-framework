import { type Abi, type Address, zeroAddress } from "viem";
import { type RwaManifest } from "~~/lib/rwa/manifest";
import { type ContractName, type GenericContract, contracts } from "~~/utils/scaffold-eth/contract";

const MANIFEST_CONTRACT_NAMES = [
  "MachineNft",
  "ContractNft",
  "ArbVault",
  "Token",
  "RewardDistributor",
] as const satisfies readonly ContractName[];

type ManifestContractName = (typeof MANIFEST_CONTRACT_NAMES)[number];

const MANIFEST_ADDRESS_KEYS: Record<ManifestContractName, keyof RwaManifest> = {
  MachineNft: "machineNft",
  ContractNft: "contractNft",
  ArbVault: "arbVault",
  Token: "token",
  RewardDistributor: "rewardDistributor",
};

/** ABI template from local Hardhat deploy when live chain entry is missing. */
const ABI_FALLBACK_CHAIN_ID = 31337;

function isValidAddress(addr?: string): addr is Address {
  return Boolean(addr && addr.startsWith("0x") && addr.toLowerCase() !== zeroAddress);
}

/**
 * Contracts present in rwa-manifest.json but not yet in deployedContracts for this chain
 * (common after framework-only deploy on Arbitrum Sepolia before bootstrap).
 */
export function manifestContractsForChain(
  chainId: number,
  manifest: RwaManifest | null,
): Partial<Record<ContractName, GenericContract>> {
  if (!manifest || manifest.chainId !== chainId) return {};

  const merged: Partial<Record<ContractName, GenericContract>> = {};
  const chainContracts = contracts[chainId as keyof typeof contracts];
  const abiSource = contracts[ABI_FALLBACK_CHAIN_ID as keyof typeof contracts];

  for (const name of MANIFEST_CONTRACT_NAMES) {
    if (chainContracts?.[name]) continue;

    const address = manifest[MANIFEST_ADDRESS_KEYS[name]];
    if (!isValidAddress(address)) continue;

    const abiTemplate = abiSource?.[name]?.abi ?? chainContracts?.[name]?.abi;
    if (!abiTemplate) continue;

    merged[name] = {
      address,
      abi: abiTemplate as Abi,
      inheritedFunctions: abiSource?.[name]?.inheritedFunctions,
    };
  }

  return merged;
}
