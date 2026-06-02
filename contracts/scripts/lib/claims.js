const { ethers } = require("hardhat");

/** Claim topics — must match RwaConstants.sol / on-chain expectations */
const CT_KYC_APPROVED = 666n;
const CT_MNFT_ISSUER = 7n;
const CT_MNFT_REGULATOR = 8n;

/**
 * Build the ClaimIssuer payload hash (same format the Identity contract verifies).
 * @param {string} identityAddress
 * @param {bigint} topic
 * @param {string} data - abi-encoded bytes
 */
function claimPayloadHash(identityAddress, topic, data) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [identityAddress, topic, data])
  );
}

/**
 * Sign and attach a claim to an identity (SDK-free).
 * @param {import('ethers').Signer} identityOwner - wallet that owns the identity subject
 * @param {string} identityAddress - deployed Identity contract
 * @param {import('ethers').Signer} claimIssuerSigner - key registered on ClaimIssuer
 * @param {string} claimIssuerAddress
 * @param {bigint} topic
 * @param {string} data - abi-encoded claim data
 */
async function addClaim(identityOwner, identityAddress, claimIssuerSigner, claimIssuerAddress, topic, data) {
  const payload = claimPayloadHash(identityAddress, topic, data);
  const signature = await claimIssuerSigner.signMessage(ethers.getBytes(payload));
  const RwaIdentity = await ethers.getContractFactory("RwaIdentity");
  const id = RwaIdentity.attach(identityAddress);
  await id.connect(identityOwner).addClaim(topic, 1n, claimIssuerAddress, signature, data, "uri");
}

/** Standard KYC claim data for test personas */
function kycData(first, last, dob, city) {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "string"],
    [first, last, dob, city]
  );
}

module.exports = {
  CT_KYC_APPROVED,
  CT_MNFT_ISSUER,
  CT_MNFT_REGULATOR,
  claimPayloadHash,
  addClaim,
  kycData,
};
