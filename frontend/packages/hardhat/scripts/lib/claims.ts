import type { Signer } from "ethers";
import { network } from "hardhat";
import OnchainID from "@onchain-id/solidity";

/** Claim topics — must match RwaConstants.sol */
export const CT_KYC_APPROVED = 666n;
export const CT_MNFT_ISSUER = 7n;
export const CT_MNFT_REGULATOR = 8n;
export const SCHEME_ECDSA = 1n;

async function getEthers() {
  const { ethers } = await network.connect();
  return ethers;
}

export async function encodeKycData(first: string, last: string, dob: string, city: string) {
  const ethers = await getEthers();
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "string"],
    [first, last, dob, city],
  );
}

export async function encodeRoleData(role: string) {
  const ethers = await getEthers();
  return ethers.AbiCoder.defaultAbiCoder().encode(["string"], [role]);
}

export async function buildClaimPayloadHash(identityAddress: string, topic: bigint, data: string) {
  const ethers = await getEthers();
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [identityAddress, topic, data]),
  );
}

export async function keyHashForAddress(addr: string) {
  const ethers = await getEthers();
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [addr]));
}

/**
 * True if identity already has a claim for `topic` from `claimIssuerAddress` that passes isClaimValid.
 */
export async function identityHasValidClaim(
  identityAddress: string,
  claimIssuerAddress: string,
  topic: bigint,
): Promise<boolean> {
  const ethers = await getEthers();
  const identity = new ethers.Contract(identityAddress, OnchainID.contracts.Identity.abi, ethers.provider);
  const claimIssuer = new ethers.Contract(
    claimIssuerAddress,
    OnchainID.contracts.ClaimIssuer.abi,
    ethers.provider,
  );

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
) {
  if (await identityHasValidClaim(identityAddress, claimIssuerAddress, topic)) {
    return;
  }

  const ethers = await getEthers();
  const payload = await buildClaimPayloadHash(identityAddress, topic, data);
  const signature = await claimIssuerSigner.signMessage(ethers.getBytes(payload));

  const identity = new ethers.Contract(identityAddress, OnchainID.contracts.Identity.abi, identityOwner);
  const claimKey = await keyHashForAddress(await identityOwner.getAddress());
  const hasClaimPurpose = await identity.keyHasPurpose(claimKey, 3);
  if (!hasClaimPurpose) {
    await identity.addKey(claimKey, 3, 1);
  }

  await identity.addClaim(topic, SCHEME_ECDSA, claimIssuerAddress, signature, data, "uri");
}
