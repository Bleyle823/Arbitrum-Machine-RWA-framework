import OnchainID from "@onchain-id/solidity";
import type { Signer } from "ethers";
import { network } from "hardhat";

/**
 * Deploy official ONCHAINID ClaimIssuer (required for T-REX TrustedIssuersRegistry).
 */
export async function deployOidClaimIssuer(managementAccount: Signer, signingAccount: Signer) {
  const { ethers } = await network.connect();

  const factory = new ethers.ContractFactory(
    OnchainID.contracts.ClaimIssuer.abi,
    OnchainID.contracts.ClaimIssuer.bytecode,
    managementAccount,
  );
  const issuer = await factory.deploy(await managementAccount.getAddress());
  await issuer.waitForDeployment();

  const keyHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await signingAccount.getAddress()]),
  );
  await issuer.connect(managementAccount).addKey(keyHash, 3, 1);

  return issuer;
}
