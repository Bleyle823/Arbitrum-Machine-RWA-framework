/**
 * Issue KYC (+ optional machine-issuer) claims after `yarn deploy`.
 *
 *   yarn hardhat run scripts/issueClaims.ts --network localhost
 *
 * Env:
 *   CLAIM_ISSUER_ADDRESS — from deploy log "ClaimIssuer ONCHAINID (KYC): 0x..."
 *   ID_FACTORY_ADDRESS, ARB_RWA_NFT_ADDRESS — optional overrides (read from deployments if unset)
 */
import * as fs from "fs";
import * as path from "path";
import { network } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { addClaim, CT_KYC_APPROVED, CT_MNFT_ISSUER, CT_MNFT_REGULATOR, encodeKycData, encodeRoleData } from "./lib/claims.js";

function deploymentAddress(name: string, networkNames = ["default", "localhost"]): string | null {
  for (const networkName of networkNames) {
    const file = path.join(process.cwd(), "deployments", networkName, `${name}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")).address as string;
    }
  }
  return null;
}

async function main() {
  const claimIssuerAddress = process.env.CLAIM_ISSUER_ADDRESS;
  if (!claimIssuerAddress) {
    throw new Error(
      "Set CLAIM_ISSUER_ADDRESS to the address printed at deploy:\n" +
        '  ClaimIssuer ONCHAINID (KYC): 0x...\n' +
        "Or add ClaimIssuer to deployments (see deploy script).",
    );
  }

  const { ethers } = await network.connect();
  const [admin, alice, bob, charlie] = await ethers.getSigners();

  const idFactoryAddr = process.env.ID_FACTORY_ADDRESS ?? deploymentAddress("IdFactory");
  const rwaNftAddr = process.env.ARB_RWA_NFT_ADDRESS ?? deploymentAddress("ArbRwaNft");

  if (!idFactoryAddr || !rwaNftAddr) {
    throw new Error(
      "Could not read IdFactory / ArbRwaNft from deployments/localhost/. " +
        "Run `yarn deploy` first or set ID_FACTORY_ADDRESS and ARB_RWA_NFT_ADDRESS.",
    );
  }

  const idFactory = new ethers.Contract(idFactoryAddr, OnchainID.contracts.Factory.abi, admin);
  const rwaNft = await ethers.getContractAt("ArbRwaNft", rwaNftAddr);

  console.log("ClaimIssuer:", claimIssuerAddress);
  console.log("IdFactory:", idFactoryAddr);
  console.log("Signer (claim issuer key on local deploy):", admin.address);

  for (const [user, salt, name] of [
    [alice, "alice", "Alice"],
    [bob, "bob", "Bob"],
    [charlie, "charlie", "Charlie"],
  ] as const) {
    let identity = await idFactory.getIdentity(user.address);
    if (identity === ethers.ZeroAddress) {
      await idFactory.createIdentity(user.address, salt);
      identity = await idFactory.getIdentity(user.address);
    }
    await addClaim(
      user,
      identity,
      admin,
      claimIssuerAddress,
      CT_KYC_APPROVED,
      await encodeKycData(name, "Test", "1990-01-01", "Berlin"),
    );
    console.log(`KYC claim → ${name} identity ${identity}`);
  }

  // Machine issuer claim for Admin (optional — for addMachineIssuer)
  let issuerIdentity = await idFactory.getIdentity(admin.address);
  if (issuerIdentity === ethers.ZeroAddress) {
    await idFactory.createIdentity(admin.address, "issuer");
    issuerIdentity = await idFactory.getIdentity(admin.address);
  }
  await addClaim(
    admin,
    issuerIdentity,
    admin,
    claimIssuerAddress,
    CT_MNFT_ISSUER,
    await encodeRoleData("machine issuer"),
  );
  await addClaim(
    admin,
    issuerIdentity,
    admin,
    claimIssuerAddress,
    CT_MNFT_REGULATOR,
    await encodeRoleData("machine regulator"),
  );
  console.log("Machine issuer + regulator claims issued for", admin.address);

  console.log("\nDone. Next: ArbRwaNft.addMachineRegulator(admin) + addMachineIssuer(admin).");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
