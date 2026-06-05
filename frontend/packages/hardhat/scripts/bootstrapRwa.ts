/**
 * Post-deploy bootstrap for live networks (Arbitrum Sepolia, etc.).
 * Creates MachineNft, ContractNft, vault, Token, and registers investors — same as local debug bootstrap.
 *
 *   yarn bootstrap --network arbitrumSepolia
 *
 * Requires framework deploy first (`yarn deploy:arbitrum-sepolia`).
 * Demo NFT seeding needs Alice/Bob/Charlie keys in .env only if you want automated demo assets;
 * otherwise use /rwa UI with each wallet after bootstrap.
 */
import * as fs from "fs";
import * as path from "path";
import { network } from "hardhat";
import { runDebugBootstrap } from "../deploy-helpers/debugBootstrap.js";
import { resolveParticipantSigners } from "../deploy-helpers/participantAccounts.js";
import { writeRwaManifest } from "../deploy-helpers/writeRwaManifest.js";
import {
  DEMO_AGREEMENT_IPFS_URL,
  DEMO_ASSET_SERIAL,
  DEMO_DEAL_REFERENCE,
  DEMO_MACHINE_DID_URI,
  DEMO_MACHINE_VALUE,
  demoAgreementHashDigest,
} from "../deploy-helpers/demoProductionAssets.js";
import generateTsAbis from "./generateTsAbis.js";

function deploymentAddress(name: string, networkNames: string[]): string | null {
  for (const networkName of networkNames) {
    const file = path.join(process.cwd(), "deployments", networkName, `${name}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")).address as string;
    }
  }
  return null;
}

async function main() {
  const networkIdx = process.argv.indexOf("--network");
  const networkName = networkIdx !== -1 ? process.argv[networkIdx + 1] : "default";
  const deploymentNetworks = [networkName, "arbitrumSepolia", "default", "localhost"];

  const { ethers } = await network.connect();
  const [admin] = await ethers.getSigners();
  if (!admin) {
    throw new Error("No deployer signer — import account with yarn account:import");
  }

  const adminAddress = await admin.getAddress();
  if (adminAddress.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") {
    throw new Error(
      "Bootstrap is using the unfunded Hardhat default account. Run via yarn bootstrap:arbitrum-sepolia " +
        "(decrypts packages/hardhat/.env deployer key), not plain hardhat run.",
    );
  }
  console.log("Deployer:", adminAddress);

  const feeTokenAddr = deploymentAddress("MockFeeToken", deploymentNetworks) ?? process.env.FEE_TOKEN_ADDRESS;
  const infoDeskAddr = deploymentAddress("InfoDesk", deploymentNetworks);
  const idFactoryAddr = deploymentAddress("IdFactory", deploymentNetworks);
  const claimIssuerAddr = deploymentAddress("ClaimIssuer", deploymentNetworks) ?? process.env.CLAIM_ISSUER_ADDRESS;
  const rwaNftAddr = deploymentAddress("ArbRwaNft", deploymentNetworks) ?? process.env.ARB_RWA_NFT_ADDRESS;
  const vaultFactoryAddr = deploymentAddress("ArbVaultFactory", deploymentNetworks);
  const feeModuleAddr =
    deploymentAddress("NativeTransferFeeModule", deploymentNetworks) ?? process.env.FEE_MODULE_ADDRESS;

  const missing = [
    ["InfoDesk", infoDeskAddr],
    ["IdFactory", idFactoryAddr],
    ["ClaimIssuer", claimIssuerAddr],
    ["ArbRwaNft", rwaNftAddr],
    ["ArbVaultFactory", vaultFactoryAddr],
    ["NativeTransferFeeModule", feeModuleAddr],
    ["FeeToken", feeTokenAddr],
  ].filter(([, v]) => !v);

  if (missing.length > 0) {
    throw new Error(
      `Missing deployments on ${networkName}: ${missing.map(([n]) => n).join(", ")}. Run yarn deploy:arbitrum-sepolia first.`,
    );
  }

  const { alice, bob, charlie, addresses } = await resolveParticipantSigners(admin);

  const saveDeployment = async (name: string, data: Record<string, unknown>) => {
    const dir = path.join(process.cwd(), "deployments", networkName);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));
  };

  console.log(`\nBootstrapping RWA on network "${networkName}"...`);
  console.log("Admin:", addresses.admin);
  console.log("Alice:", addresses.alice, alice ? "(signer)" : "(address only)");
  console.log("Bob:", addresses.bob, bob ? "(signer)" : "(address only)");
  console.log("Charlie:", addresses.charlie, charlie ? "(signer)" : "(address only)");
  if (!alice || !bob || !charlie) {
    console.log(
      "Tip: set ALICE_PRIVATE_KEY, BOB_PRIVATE_KEY, CHARLIE_PRIVATE_KEY in packages/hardhat/.env for full demo NFT seeding.",
    );
  }

  try {
    const feeToken = await ethers.getContractAt("MockFeeToken", feeTokenAddr!);
    const topUp = ethers.parseEther("1000000");
    for (const wallet of [addresses.alice, addresses.bob, addresses.charlie]) {
      await (await feeToken.mint(wallet, topUp)).wait();
    }
    console.log("Minted MockFeeToken to Alice, Bob, Charlie for /rwa fees");
  } catch {
    console.log("Fee token is not MockFeeToken — fund Alice/Bob/Charlie with USDC manually");
  }

  const demo = await runDebugBootstrap(saveDeployment, {
    admin,
    alice: { address: addresses.alice, signer: alice },
    bob: { address: addresses.bob, signer: bob },
    charlie: { address: addresses.charlie, signer: charlie },
    feeTokenAddr: feeTokenAddr!,
    infoDeskAddr: infoDeskAddr!,
    idFactoryAddr: idFactoryAddr!,
    claimIssuerAddr: claimIssuerAddr!,
    rwaNftAddr: rwaNftAddr!,
    vaultFactoryAddr: vaultFactoryAddr!,
    feeModuleProxyAddr: feeModuleAddr!,
    seedDemoAssets: process.env.SKIP_DEMO_ASSETS !== "true",
  });

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  writeRwaManifest(demo, {
    chainId,
    feeToken: feeTokenAddr!,
    feeModule: feeModuleAddr!,
    arbRwaNft: rwaNftAddr!,
    assetSerial: DEMO_ASSET_SERIAL,
    dealReference: DEMO_DEAL_REFERENCE,
    machineDidUri: DEMO_MACHINE_DID_URI,
    machineValueWei: DEMO_MACHINE_VALUE.toString(),
    agreementMetadataHash: demoAgreementHashDigest(),
    agreementUrl: DEMO_AGREEMENT_IPFS_URL,
    alice: addresses.alice,
    bob: addresses.bob,
    charlie: addresses.charlie,
    admin: addresses.admin,
  });

  await generateTsAbis();
  console.log("\nBootstrap complete. Refresh /debug and /rwa — all vault/NFT contracts should appear.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
