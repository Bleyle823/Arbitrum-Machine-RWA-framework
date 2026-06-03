const hre = require("hardhat");
const OnchainID = require("@onchain-id/solidity");

/**
 * Deploy official ONCHAINID stack (Identity impl, ImplementationAuthority, IdFactory).
 */
async function deployOidStack(deployer) {
  const identityImplementation = await new hre.ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  ).deploy(deployer.address, true);
  await identityImplementation.waitForDeployment();
  const identityImplementationAddr = await identityImplementation.getAddress();

  const implementationAuthority = await new hre.ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  ).deploy(identityImplementationAddr);
  await implementationAuthority.waitForDeployment();
  const implementationAuthorityAddr = await implementationAuthority.getAddress();

  const onchainIdFactory = await new hre.ethers.ContractFactory(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    deployer
  ).deploy(implementationAuthorityAddr);
  await onchainIdFactory.waitForDeployment();
  const onchainIdFactoryAddr = await onchainIdFactory.getAddress();

  return {
    identityImplementation,
    implementationAuthority,
    onchainIdFactory,
    identityImplementationAddr,
    implementationAuthorityAddr,
    onchainIdFactoryAddr,
  };
}

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

module.exports = { deployOidStack, deployOidClaimIssuer };
