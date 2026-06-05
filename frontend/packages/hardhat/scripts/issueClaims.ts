/**
 * Issue KYC (+ machine role) claims after `yarn deploy`.
 * Safe to re-run: skips identities/claims that already exist (e.g. after debug bootstrap).
 *
 *   yarn issue-claims:arbitrum-sepolia
 */
import { network } from "hardhat";
import { deploymentNetworkOrder, readDeploymentAddress } from "../deploy-helpers/deploymentPaths.js";
import { issueParticipantClaims } from "../deploy-helpers/issueClaimsFlow.js";
import { resolveParticipantSigners } from "../deploy-helpers/participantAccounts.js";

async function addressHasCode(
  ethers: Awaited<ReturnType<typeof network.connect>>["ethers"],
  address: string,
): Promise<boolean> {
  return (await ethers.provider.getCode(address)) !== "0x";
}

async function resolveContractAddress(
  ethers: Awaited<ReturnType<typeof network.connect>>["ethers"],
  label: string,
  contractName: string,
  envVar?: string,
): Promise<string> {
  const networks = deploymentNetworkOrder();
  const fromDeployment = readDeploymentAddress(contractName, networks);
  const envAddress = envVar ? process.env[envVar] : undefined;

  if (fromDeployment && (await addressHasCode(ethers, fromDeployment))) {
    if (envAddress && envAddress.toLowerCase() !== fromDeployment.toLowerCase()) {
      console.warn(
        `${envVar} in .env (${envAddress}) differs from deployments/${networks[0]}/${contractName}.json (${fromDeployment}); using deployment.`,
      );
    }
    return fromDeployment;
  }

  if (envAddress && (await addressHasCode(ethers, envAddress))) {
    console.warn(`Using ${envVar} from .env (${envAddress}) — no deployment artifact with code on this chain.`);
    return envAddress;
  }

  const tried = [fromDeployment, envAddress].filter(Boolean).join(", ") || "(none)";
  throw new Error(
    `${label} has no contract code on this network (tried: ${tried}). ` +
      `Run yarn deploy:arbitrum-sepolia, or remove stale ${envVar ?? "addresses"} from .env.`,
  );
}

async function main() {
  const { ethers } = await network.connect();

  const claimIssuerAddress = await resolveContractAddress(ethers, "ClaimIssuer", "ClaimIssuer", "CLAIM_ISSUER_ADDRESS");
  const idFactoryAddr = await resolveContractAddress(ethers, "IdFactory", "IdFactory", "ID_FACTORY_ADDRESS");

  const [admin] = await ethers.getSigners();
  const { alice, bob, charlie, addresses } = await resolveParticipantSigners(admin);

  console.log("ClaimIssuer:", claimIssuerAddress);
  console.log("IdFactory:", idFactoryAddr);
  console.log("Admin:", addresses.admin);
  console.log("Alice:", addresses.alice);
  console.log("Bob:", addresses.bob);
  console.log("Charlie:", addresses.charlie);

  await issueParticipantClaims(idFactoryAddr, claimIssuerAddress, admin, {
    alice: { address: addresses.alice, signer: alice },
    bob: { address: addresses.bob, signer: bob },
    charlie: { address: addresses.charlie, signer: charlie },
  });

  console.log("\nDone. (Skipped steps that were already satisfied.)");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
