const hre = require("hardhat");
const OnchainID = require("@onchain-id/solidity");

/** Claim topics — must match RwaConstants.sol */
const CT_KYC_APPROVED = 666n;
const CT_MNFT_ISSUER = 7n;
const CT_MNFT_REGULATOR = 8n;
const SCHEME_ECDSA = 1n;

function claimPayloadHash(identityAddress, topic, data) {
  return hre.ethers.keccak256(
    hre.ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [identityAddress, topic, data])
  );
}

function keyHashForAddress(addr) {
  return hre.ethers.keccak256(hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [addr]));
}

async function identityHasValidClaim(identityAddress, claimIssuerAddress, topic) {
  const identity = new hre.ethers.Contract(identityAddress, OnchainID.contracts.Identity.abi, hre.ethers.provider);
  const claimIssuer = new hre.ethers.Contract(
    claimIssuerAddress,
    OnchainID.contracts.ClaimIssuer.abi,
    hre.ethers.provider
  );

  const claimIds = await identity.getClaimIdsByTopic(topic);
  for (const claimId of claimIds) {
    const [, , issuer, sig, data] = await identity.getClaim(claimId);
    if (issuer.toLowerCase() !== claimIssuerAddress.toLowerCase()) continue;
    if (await claimIssuer.isClaimValid(identityAddress, topic, sig, data)) return true;
  }
  return false;
}

/**
 * Sign with ClaimIssuer key and attach claim to an ONCHAINID proxy identity.
 * Idempotent: skips if a valid claim for the same topic + issuer already exists.
 */
async function addClaim(identityOwner, identityAddress, claimIssuerSigner, claimIssuerAddress, topic, data) {
  if (await identityHasValidClaim(identityAddress, claimIssuerAddress, topic)) {
    return;
  }

  const payload = claimPayloadHash(identityAddress, topic, data);
  const signature = await claimIssuerSigner.signMessage(hre.ethers.getBytes(payload));

  const identity = new hre.ethers.Contract(identityAddress, OnchainID.contracts.Identity.abi, identityOwner);
  const claimKey = keyHashForAddress(await identityOwner.getAddress());
  const hasClaimPurpose = await identity.keyHasPurpose(claimKey, 3);
  if (!hasClaimPurpose) {
    await identity.addKey(claimKey, 3, 1);
  }

  await identity.addClaim(topic, SCHEME_ECDSA, claimIssuerAddress, signature, data, "uri");
}

function kycData(first, last, dob, city) {
  return hre.ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "string"],
    [first, last, dob, city]
  );
}

function roleData(role) {
  return hre.ethers.AbiCoder.defaultAbiCoder().encode(["string"], [role]);
}

module.exports = {
  CT_KYC_APPROVED,
  CT_MNFT_ISSUER,
  CT_MNFT_REGULATOR,
  SCHEME_ECDSA,
  claimPayloadHash,
  identityHasValidClaim,
  addClaim,
  kycData,
  roleData,
};
