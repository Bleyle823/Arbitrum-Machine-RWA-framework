/**
 * Read-only check: demo machine NFT + manifest contractId on Arbitrum Sepolia.
 *   yarn hardhat run scripts/verifyDemoState.ts --network arbitrumSepolia
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { network } from "hardhat";
import { deploymentJsonPath } from "../deploy-helpers/deploymentPaths.js";

const MANIFEST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../nextjs/public/rwa-manifest.json",
);

function loadDeployment(name: string, networkName = "arbitrumSepolia"): { address: string; abi: unknown[] } | null {
  const file = deploymentJsonPath(networkName, name);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { address: string; abi: unknown[] };
  return { address: data.address, abi: data.abi };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
    machineNft: string;
    contractNft: string;
    arbVault: string;
    token?: string;
    machineTokenId: string;
    contractId: string;
    alice: string;
    bob: string;
    charlie: string;
  };

  const { ethers } = await network.connect();
  const machineNft = await ethers.getContractAt("MachineNft", manifest.machineNft);
  const contractNft = await ethers.getContractAt("ContractNft", manifest.contractNft);
  const arbVault = await ethers.getContractAt("ArbVault", manifest.arbVault);
  const tokenId = BigInt(manifest.machineTokenId);

  console.log("MachineNft:", manifest.machineNft);
  console.log("ContractNft:", manifest.contractNft);
  console.log("ArbVault:", manifest.arbVault);
  console.log("machineTokenId:", tokenId.toString());
  console.log("manifest contractId:", manifest.contractId);

  try {
    const owner = await machineNft.ownerOf(tokenId);
    console.log("ownerOf(machine):", owner);
    console.log("expected Alice:", manifest.alice);
    console.log(owner.toLowerCase() === manifest.alice.toLowerCase() ? "PASS machine NFT" : "FAIL owner mismatch");
  } catch (e) {
    console.error("FAIL ownerOf(machine) — token not minted:", (e as Error).message);
    process.exitCode = 1;
  }

  if (manifest.contractId === "0") {
    console.error("FAIL manifest contractId is 0 — demo CNFT not seeded; run yarn seed:demo-assets");
    process.exitCode = 1;
    return;
  }

  const contractId = BigInt(manifest.contractId);
  try {
    const cnftOwner = await contractNft.ownerOf(contractId);
    console.log("ownerOf(contract):", cnftOwner);
    console.log(cnftOwner.toLowerCase() === manifest.alice.toLowerCase() ? "PASS contract NFT" : "FAIL owner mismatch");
    if (cnftOwner.toLowerCase() !== manifest.alice.toLowerCase()) process.exitCode = 1;
  } catch (e) {
    console.error("FAIL ownerOf(contract) — token not minted:", (e as Error).message);
    console.error("Run: yarn seed:demo-assets (with participant keys in .env)");
    process.exitCode = 1;
  }

  const vaultTaker = await arbVault.vaultTaker();
  console.log("vaultTaker:", vaultTaker);
  console.log(
    vaultTaker.toLowerCase() === manifest.alice.toLowerCase()
      ? "PASS vaultTaker is Alice (connect Alice wallet for depositAndMint)"
      : "FAIL vaultTaker mismatch",
  );
  if (vaultTaker.toLowerCase() !== manifest.alice.toLowerCase()) process.exitCode = 1;

  const tokenAddr = manifest.token;
  if (tokenAddr) {
    const token = await ethers.getContractAt("Token", tokenAddr);
    const irAddr = await token.identityRegistry();
    const ir = await ethers.getContractAt("IdentityRegistry", irAddr);
    const idFactoryDeploy = loadDeployment("IdFactory");
    const idFactory = idFactoryDeploy
      ? new ethers.Contract(idFactoryDeploy.address, idFactoryDeploy.abi, ethers.provider)
      : null;

    for (const label of ["alice", "bob", "charlie"] as const) {
      const wallet = manifest[label];
      const onchainId = idFactory ? await idFactory.getIdentity(wallet) : null;
      const registeredId = await ir.identity(wallet);
      const verified = await ir.isVerified(wallet);
      console.log(`${label}: onchainId=${onchainId ?? "?"}, registeredId=${registeredId}, isVerified=${verified}`);
      if (!verified) {
        console.error(`FAIL ${label} not verified — run: yarn issue-claims:arbitrum-sepolia`);
        process.exitCode = 1;
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
