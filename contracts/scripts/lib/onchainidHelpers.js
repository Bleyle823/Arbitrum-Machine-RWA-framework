const hre = require("hardhat");

/**
 * Deploy official ONCHAINID ClaimIssuer (required for T-REX TrustedIssuersRegistry).
 */
async function deployOidClaimIssuer(managementAccount, signingAccount) {
  const factory = await hre.ethers.getContractFactory(
    "@onchain-id/solidity/contracts/ClaimIssuer.sol:ClaimIssuer"
  );
  const issuer = await factory.connect(managementAccount).deploy(managementAccount.address);
  await issuer.waitForDeployment();

  const keyHash = hre.ethers.keccak256(
    hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [signingAccount.address])
  );
  await issuer.connect(managementAccount).addKey(keyHash, 3, 1);

  return issuer;
}

module.exports = { deployOidClaimIssuer };
