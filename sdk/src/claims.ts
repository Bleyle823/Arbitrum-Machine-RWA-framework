import type { Provider, Signer } from "ethers";
import { AbiCoder, Contract, getBytes, keccak256, toUtf8Bytes } from "ethers";
import OnchainID from "@onchain-id/solidity";
import { CT_KYC_APPROVED, SCHEME_ECDSA } from "./constants.js";

const abiCoder = AbiCoder.defaultAbiCoder();

export function encodeKycData(first: string, last: string, dob: string, city: string): string {
  return abiCoder.encode(["string", "string", "string", "string"], [first, last, dob, city]);
}

export function encodeRoleData(role: string): string {
  return abiCoder.encode(["string"], [role]);
}

export function buildClaimPayloadHash(identityAddress: string, topic: bigint, data: string): string {
  return keccak256(abiCoder.encode(["address", "uint256", "bytes"], [identityAddress, topic, data]));
}

export function keyHashForAddress(addr: string): string {
  return keccak256(abiCoder.encode(["address"], [addr]));
}

/**
 * True if identity already has a claim for `topic` from `claimIssuerAddress` that passes isClaimValid.
 */
export async function identityHasValidClaim(
  provider: Provider,
  identityAddress: string,
  claimIssuerAddress: string,
  topic: bigint,
): Promise<boolean> {
  const identity = new Contract(identityAddress, OnchainID.contracts.Identity.abi, provider);
  const claimIssuer = new Contract(claimIssuerAddress, OnchainID.contracts.ClaimIssuer.abi, provider);

  const claimIds: string[] = await identity.getClaimIdsByTopic(topic);
  for (const claimId of claimIds) {
    const [, , issuer, sig, data] = await identity.getClaim(claimId);
    if (issuer.toLowerCase() !== claimIssuerAddress.toLowerCase()) continue;
    if (await claimIssuer.isClaimValid(identityAddress, topic, sig, data)) return true;
  }
  return false;
}

/**
 * Sign with ClaimIssuer key and attach claim (identity owner sends addClaim).
 * Idempotent: skips if a valid claim for the same topic + issuer already exists.
 */
export async function addClaim(
  identityOwner: Signer,
  identityAddress: string,
  claimIssuerSigner: Signer,
  claimIssuerAddress: string,
  topic: bigint,
  data: string,
  provider?: Provider,
): Promise<void> {
  const readProvider = provider ?? identityOwner.provider;
  if (!readProvider) throw new Error("addClaim requires a provider on identityOwner or provider argument");

  if (await identityHasValidClaim(readProvider, identityAddress, claimIssuerAddress, topic)) {
    return;
  }

  const payload = buildClaimPayloadHash(identityAddress, topic, data);
  const signature = await claimIssuerSigner.signMessage(getBytes(payload));

  const identity = new Contract(identityAddress, OnchainID.contracts.Identity.abi, identityOwner);
  const claimKey = keyHashForAddress(await identityOwner.getAddress());
  const hasClaimPurpose = await identity.keyHasPurpose(claimKey, 3);
  if (!hasClaimPurpose) {
    await identity.addKey(claimKey, 3, 1);
  }

  await identity.addClaim(topic, SCHEME_ECDSA, claimIssuerAddress, signature, data, "uri");
}

export { CT_KYC_APPROVED };

/** UTF-8 bytes for machine DID registration. */
export { toUtf8Bytes };
