import {
  type Address,
  type Hex,
  type PublicClient,
  encodeFunctionData,
  parseEther,
} from "viem";
import {
  arbVaultExtendedAbi,
  identityRegistryExtendedAbi,
  machineNftExtendedAbi,
  tokenExtendedAbi,
} from "./abis.js";
import {
  DEFAULT_TRANSFER_FEE_ALLOWANCE,
  DEFAULT_VAULT_MINT_AMOUNT,
} from "./constants.js";
import { type RwaManifest, manifestContractId, manifestMachineTokenId } from "./manifest.js";

export async function readIsVerified(
  client: PublicClient,
  identityRegistry: Address,
  wallet: Address,
): Promise<boolean> {
  return client.readContract({
    address: identityRegistry,
    abi: identityRegistryExtendedAbi,
    functionName: "isVerified",
    args: [wallet],
  }) as Promise<boolean>;
}

export async function readVaultMinted(client: PublicClient, arbVault: Address): Promise<boolean> {
  return client.readContract({
    address: arbVault,
    abi: arbVaultExtendedAbi,
    functionName: "minted",
  }) as Promise<boolean>;
}

export async function readTokenBalance(client: PublicClient, token: Address, account: Address): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: tokenExtendedAbi,
    functionName: "balanceOf",
    args: [account],
  }) as Promise<bigint>;
}

export async function readMachineOwner(
  client: PublicClient,
  machineNft: Address,
  tokenId: bigint,
): Promise<Address> {
  return client.readContract({
    address: machineNft,
    abi: machineNftExtendedAbi,
    functionName: "ownerOf",
    args: [tokenId],
  }) as Promise<Address>;
}

export async function readTransferFee(
  client: PublicClient,
  arbVault: Address,
  transferAmount: bigint,
): Promise<{ fee: bigint; account: Address }> {
  const [fee, account] = (await client.readContract({
    address: arbVault,
    abi: arbVaultExtendedAbi,
    functionName: "transactionFeeAndAccount",
    args: [transferAmount],
  })) as readonly [bigint, Address];
  return { fee, account };
}

/** Encode depositAndMint calldata with correct bigint tokenIds (safe for large contractId). */
export function encodeDepositAndMint(
  manifest: RwaManifest,
  mintAmount: bigint = DEFAULT_VAULT_MINT_AMOUNT,
): Hex {
  const contractId = manifestContractId(manifest);
  if (!contractId) throw new Error("manifest contractId is missing or zero");

  return encodeFunctionData({
    abi: arbVaultExtendedAbi,
    functionName: "depositAndMint",
    args: [
      [manifest.machineNft as Address, manifest.contractNft as Address],
      [manifestMachineTokenId(manifest), contractId],
      mintAmount,
    ],
  });
}

/** Default 10-token transfer size (18 decimals). */
export const DEFAULT_TRANSFER_AMOUNT = parseEther("10");

export {
  DEFAULT_TRANSFER_FEE_ALLOWANCE,
  DEFAULT_VAULT_MINT_AMOUNT,
};
