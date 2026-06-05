/**
 * Seed demo Machine + Contract NFTs only (no full re-bootstrap).
 * Uses existing vault/NFT addresses from rwa-manifest.json.
 *
 *   yarn seed:demo-assets
 *
 * Requires DEPLOY_PASSWORD or DEPLOYER_PRIVATE_KEY in .env (no interactive password prompt).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { network } from "hardhat";
import { seedDemoAssetsOnly } from "../deploy-helpers/debugBootstrap.js";
import { resolveParticipantSigners } from "../deploy-helpers/participantAccounts.js";
import { DEMO_AGREEMENT_IPFS_URL, demoAgreementHashDigest } from "../deploy-helpers/demoProductionAssets.js";
import type { RwaManifest } from "../deploy-helpers/writeRwaManifest.js";

const HARDHAT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.resolve(HARDHAT_ROOT, "../nextjs/public/rwa-manifest.json");

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error("Missing rwa-manifest.json — run yarn bootstrap:arbitrum-sepolia first");
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as RwaManifest;
  if (!manifest.machineNft || manifest.machineNft.startsWith("0x000")) {
    throw new Error("Manifest has no MachineNft — run yarn bootstrap:arbitrum-sepolia first");
  }

  const { ethers } = await network.connect();
  const [admin] = await ethers.getSigners();
  if (!admin) throw new Error("No deployer signer");

  const { alice, bob, charlie, addresses } = await resolveParticipantSigners(admin);
  console.log("Alice:", addresses.alice, alice ? "(signer)" : "(MISSING KEY)");
  console.log("Bob:", addresses.bob, bob ? "(signer)" : "(MISSING KEY)");
  console.log("Charlie:", addresses.charlie, charlie ? "(signer)" : "(MISSING KEY)");

  const infoDeskFile = path.join(HARDHAT_ROOT, "deployments", "arbitrumSepolia", "InfoDesk.json");
  if (!fs.existsSync(infoDeskFile)) throw new Error("InfoDesk deployment not found");
  const infoDeskAddr = JSON.parse(fs.readFileSync(infoDeskFile, "utf8")).address as string;

  const seeded = await seedDemoAssetsOnly({
    admin,
    alice: { address: addresses.alice, signer: alice },
    bob: { address: addresses.bob, signer: bob },
    charlie: { address: addresses.charlie, signer: charlie },
    feeTokenAddr: manifest.feeToken,
    infoDeskAddr,
    machineNftAddr: manifest.machineNft,
    contractNftAddr: manifest.contractNft,
  });

  manifest.machineTokenId = seeded.machineTokenId.toString();
  manifest.contractId = seeded.contractId.toString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("\nUpdated rwa-manifest.json");
  console.log("  machineTokenId:", manifest.machineTokenId);
  console.log("  contractId:", manifest.contractId);
  console.log("  agreementMetadataHash:", demoAgreementHashDigest());
  console.log("  agreementUrl:", DEMO_AGREEMENT_IPFS_URL);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
