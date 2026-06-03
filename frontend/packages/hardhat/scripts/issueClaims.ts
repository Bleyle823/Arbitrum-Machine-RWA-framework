/**
 * Issue KYC (+ machine role) claims after `yarn deploy`.
 * Safe to re-run: skips identities/claims that already exist (e.g. after debug bootstrap).
 *
 *   yarn issue-claims
 */
import * as fs from "fs";
import * as path from "path";
import { network } from "hardhat";
import { issueParticipantClaims } from "../deploy-helpers/issueClaimsFlow.js";

function deploymentAddress(name: string, networkNames = ["default", "localhost"]): string | null {
  for (const networkName of networkNames) {
    const file = path.join(process.cwd(), "deployments", networkName, `${name}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")).address as string;
    }
  }
  return null;
}

async function assertDeployed(ethers: Awaited<ReturnType<typeof network.connect>>["ethers"], label: string, address: string) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    throw new Error(
      `${label} has no code at ${address}. Start \`yarn chain\`, then \`yarn deploy --tags RwaFramework --reset\` in frontend/.`,
    );
  }
}

async function main() {
  const { ethers } = await network.connect();

  const deployedClaimIssuer = deploymentAddress("ClaimIssuer");
  const deployedIdFactory = deploymentAddress("IdFactory");

  // Prefer fresh deployments/*.json over .env (common after redeploy without updating .env)
  let claimIssuerAddress = deployedClaimIssuer ?? process.env.CLAIM_ISSUER_ADDRESS;
  const idFactoryAddr = deployedIdFactory ?? process.env.ID_FACTORY_ADDRESS;

  if (
    process.env.CLAIM_ISSUER_ADDRESS &&
    deployedClaimIssuer &&
    process.env.CLAIM_ISSUER_ADDRESS.toLowerCase() !== deployedClaimIssuer.toLowerCase()
  ) {
    const envHasCode = (await ethers.provider.getCode(process.env.CLAIM_ISSUER_ADDRESS)) !== "0x";
    if (!envHasCode) {
      console.warn(
        "CLAIM_ISSUER_ADDRESS in .env has no code on this chain; using deployments/ClaimIssuer.json instead.",
        "\n  stale .env:",
        process.env.CLAIM_ISSUER_ADDRESS,
        "\n  using:    ",
        deployedClaimIssuer,
      );
      claimIssuerAddress = deployedClaimIssuer;
    }
  }

  if (!claimIssuerAddress || !idFactoryAddr) {
    throw new Error("Run `yarn deploy` first or set CLAIM_ISSUER_ADDRESS and ID_FACTORY_ADDRESS.");
  }

  const [admin, alice, bob, charlie] = await ethers.getSigners();

  await assertDeployed(ethers, "IdFactory", idFactoryAddr);
  await assertDeployed(ethers, "ClaimIssuer", claimIssuerAddress);

  console.log("ClaimIssuer:", claimIssuerAddress);
  console.log("IdFactory:", idFactoryAddr);
  console.log("Claim issuer signer (local):", await admin.getAddress());

  await issueParticipantClaims(idFactoryAddr, claimIssuerAddress, admin, alice, bob, charlie);

  console.log("\nDone. (Skipped steps that were already satisfied.)");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
