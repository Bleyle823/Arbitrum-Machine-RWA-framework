import type { Signer } from "ethers";
import { network } from "hardhat";
import { issueParticipantClaims, type IssuedIdentities } from "./issueClaimsFlow.js";
import { CT_KYC_APPROVED } from "../scripts/lib/claims.js";

import {
  DEMO_AGREEMENT_IPFS_URL,
  DEMO_MACHINE_TOKEN_ID,
  DEMO_MACHINE_VALUE,
  DEMO_VAULT_NAME,
  DEMO_VAULT_SYMBOL,
  demoAgreementHashDigest,
  demoMachineDidBytes,
} from "./demoProductionAssets.js";

/** Lower machine registration fee for local UI testing (1% of machineValue). */
const DEBUG_MACHINE_FEE_BPS = 100n;

/** @deprecated use DEMO_MACHINE_TOKEN_ID */
export const DEBUG_MACHINE_TOKEN_ID = DEMO_MACHINE_TOKEN_ID;
/** @deprecated use DEMO_DEAL_REFERENCE from demoProductionAssets */
export const DEBUG_CONTRACT_HASH_LABEL = "CYBER-AUTO-DELIVERY-2026-0042";

export type DebugBootstrapResult = {
  identities: IssuedIdentities;
  machineNftAddr: string;
  contractNftAddr: string;
  vaultAddr: string;
  tokenAddr: string;
  distributorAddr: string;
  identityRegistryAddr: string;
  machineTokenId: bigint;
  contractId: bigint;
};

export type BootstrapParticipant = {
  address: string;
  signer: Signer | null;
};

type EnvSave = (name: string, data: Record<string, unknown>) => Promise<void>;

async function persistContract(envSave: EnvSave, name: string, address: string) {
  const { ethers } = await network.connect();
  const factory = await ethers.getContractFactory(name);
  await envSave(name, {
    address,
    abi: JSON.parse(factory.interface.formatJson()),
    bytecode: factory.bytecode,
    argsData: "0x",
    metadata: "{}",
  });
}

/**
 * After RwaFramework deploy: issue claims, wire NFT registry, create vault, register investors,
 * optionally mint demo Machine + Contract NFTs. Persists addresses for Scaffold-ETH /debug UI.
 */
export async function runDebugBootstrap(
  envSave: EnvSave,
  params: {
    admin: Signer;
    alice: BootstrapParticipant;
    bob: BootstrapParticipant;
    charlie: BootstrapParticipant;
    feeTokenAddr: string;
    infoDeskAddr: string;
    idFactoryAddr: string;
    claimIssuerAddr: string;
    rwaNftAddr: string;
    vaultFactoryAddr: string;
    feeModuleProxyAddr: string;
    seedDemoAssets?: boolean;
  },
): Promise<DebugBootstrapResult> {
  const { ethers } = await network.connect();
  const {
    admin,
    alice,
    bob,
    charlie,
    feeTokenAddr,
    infoDeskAddr,
    idFactoryAddr,
    claimIssuerAddr,
    rwaNftAddr,
    vaultFactoryAddr,
    feeModuleProxyAddr,
    seedDemoAssets: seedDemoAssetsParam = true,
  } = params;

  const canSeedDemoAssets =
    seedDemoAssetsParam && alice.signer !== null && bob.signer !== null && charlie.signer !== null;

  console.log("\n--- Debug bootstrap: identities + claims ---");
  const identities = await issueParticipantClaims(idFactoryAddr, claimIssuerAddr, admin, {
    alice,
    bob,
    charlie,
  });

  const infoDesk = await ethers.getContractAt("InfoDesk", infoDeskAddr);
  await infoDesk.setValue(0, DEBUG_MACHINE_FEE_BPS);
  console.log("InfoDesk machine fee bps set to", DEBUG_MACHINE_FEE_BPS.toString(), "(1% for local UI)");

  const rwaNft = await ethers.getContractAt("ArbRwaNft", rwaNftAddr);

  console.log("\n--- Debug bootstrap: MachineNft + ContractNft ---");
  await (await rwaNft.addMachineRegulator(await admin.getAddress())).wait();
  const contractNftAddr = await rwaNft.deployContractNft.staticCall();
  await (await rwaNft.deployContractNft()).wait();
  await (await rwaNft.addMachineIssuer(await admin.getAddress())).wait();
  const machineNftAddr = await rwaNft.getMachineNftByIssuer(await admin.getAddress());

  console.log("MachineNft:", machineNftAddr);
  console.log("ContractNft:", contractNftAddr);

  await persistContract(envSave, "MachineNft", machineNftAddr);
  await persistContract(envSave, "ContractNft", contractNftAddr);

  console.log("\n--- Debug bootstrap: vault + T-REX token ---");
  const vaultFactory = await ethers.getContractAt("ArbVaultFactory", vaultFactoryAddr);
  const claimIssuers = [claimIssuerAddr];
  const claimTopics = [CT_KYC_APPROVED];
  const complianceModules = [feeModuleProxyAddr];

  const tokenAddr = await vaultFactory.deployTrexVault.staticCall(
    DEMO_VAULT_NAME,
    DEMO_VAULT_SYMBOL,
    claimIssuers,
    claimTopics,
    complianceModules,
  );
  await (await vaultFactory.deployTrexVault(DEMO_VAULT_NAME, DEMO_VAULT_SYMBOL, claimIssuers, claimTopics, complianceModules)).wait();

  const attachTx = await vaultFactory.attachVaultPeers(tokenAddr, alice.address, feeTokenAddr, complianceModules);
  const receipt = await attachTx.wait();
  let vaultAddr = "";
  let distributorAddr = "";
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = vaultFactory.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed?.name === "VaultCreated") {
        vaultAddr = parsed.args[0] as string;
        distributorAddr = parsed.args[2] as string;
        break;
      }
    } catch {
      // not VaultCreated
    }
  }
  if (!vaultAddr) throw new Error("VaultCreated event not found");

  await (await vaultFactory.unpauseVaultToken(vaultAddr)).wait();

  const token = await ethers.getContractAt("Token", tokenAddr);
  const identityRegistryAddr = await token.identityRegistry();
  const ir = await ethers.getContractAt("IdentityRegistry", identityRegistryAddr);

  for (const [wallet, identity] of [
    [alice.address, identities.aliceIdentity],
    [bob.address, identities.bobIdentity],
    [charlie.address, identities.charlieIdentity],
  ] as const) {
    await (await ir.registerIdentity(wallet, identity, 276)).wait();
  }

  console.log("ArbVault:", vaultAddr);
  console.log("Token (security):", tokenAddr);
  console.log("IdentityRegistry:", identityRegistryAddr);
  console.log("RewardDistributor:", distributorAddr);

  await persistContract(envSave, "Token", tokenAddr);
  await persistContract(envSave, "IdentityRegistry", identityRegistryAddr);
  await persistContract(envSave, "ArbVault", vaultAddr);
  await persistContract(envSave, "RewardDistributor", distributorAddr);

  let machineTokenId = DEMO_MACHINE_TOKEN_ID;
  let contractId = 0n;

  if (canSeedDemoAssets) {
    console.log("\n--- Debug bootstrap: demo Machine NFT + Contract NFT for Alice ---");
    const seeded = await seedDemoAssetsOnly({
      admin,
      alice,
      bob,
      charlie,
      feeTokenAddr,
      infoDeskAddr,
      machineNftAddr,
      contractNftAddr,
    });
    machineTokenId = seeded.machineTokenId;
    contractId = seeded.contractId;
    console.log("Demo assetSerial → machineTokenId:", machineTokenId.toString());
    console.log("Demo dealRef / agreementUrl:", DEMO_AGREEMENT_IPFS_URL);
    console.log("Demo agreementMetadataHash (keccak256 JSON, not Arbiscan tx):", demoAgreementHashDigest());
    console.log("Demo contractId:", contractId.toString());
  } else if (seedDemoAssetsParam) {
    console.log(
      "\nSkipped demo Machine/Contract NFT seeding — Alice/Bob/Charlie private keys not available on this network.",
    );
    console.log("Run yarn seed:demo-assets after setting participant keys in .env");
  }

  console.log("\n--- Debug bootstrap complete (all contracts on /debug) ---");

  return {
    identities,
    machineNftAddr,
    contractNftAddr,
    vaultAddr,
    tokenAddr,
    distributorAddr,
    identityRegistryAddr,
    machineTokenId,
    contractId,
  };
}

export type SeedDemoAssetsResult = {
  machineTokenId: bigint;
  contractId: bigint;
  machineMinted: boolean;
  contractMinted: boolean;
};

/** Mint demo Machine NFT + completed Contract NFT (Alice/Bob/Charlie signers required). */
export async function seedDemoAssetsOnly(params: {
  admin: Signer;
  alice: BootstrapParticipant;
  bob: BootstrapParticipant;
  charlie: BootstrapParticipant;
  feeTokenAddr: string;
  infoDeskAddr: string;
  machineNftAddr: string;
  contractNftAddr: string;
}): Promise<SeedDemoAssetsResult> {
  const { ethers } = await network.connect();
  const { admin, alice, bob, charlie, feeTokenAddr, infoDeskAddr, machineNftAddr, contractNftAddr } = params;

  if (!alice.signer || !bob.signer || !charlie.signer) {
    throw new Error(
      "Alice/Bob/Charlie signers required — set ALICE_PRIVATE_KEY, BOB_PRIVATE_KEY, CHARLIE_PRIVATE_KEY in .env",
    );
  }

  const machineTokenId = DEMO_MACHINE_TOKEN_ID;
  let contractId = 0n;
  let machineMinted = false;
  let contractMinted = false;

  const feeToken = await ethers.getContractAt("MockFeeToken", feeTokenAddr);
  const machineNft = await ethers.getContractAt("MachineNft", machineNftAddr);
  const contractNft = await ethers.getContractAt("ContractNft", contractNftAddr);
  const infoDesk = await ethers.getContractAt("InfoDesk", infoDeskAddr);
  const aliceSigner = alice.signer;
  const bobSigner = bob.signer;
  const charlieSigner = charlie.signer;

  try {
    const owner = await machineNft.ownerOf(machineTokenId);
    if (owner.toLowerCase() === alice.address.toLowerCase()) {
      console.log("Machine NFT already minted to Alice — skipping registerMachine");
      machineMinted = true;
    }
  } catch {
    // not minted
  }

  if (!machineMinted) {
    const machineValue = DEMO_MACHINE_VALUE;
    const [fee] = await machineNft.registrationFeeAndAccount(machineValue);
    await (await feeToken.connect(aliceSigner).approve(machineNftAddr, fee)).wait();
    await (
      await machineNft.connect(admin).registerMachine(alice.address, machineValue, machineTokenId, demoMachineDidBytes())
    ).wait();
    machineMinted = true;
    console.log("Minted Machine NFT", machineTokenId.toString(), "→ Alice");
  }

  const hashDigest = demoAgreementHashDigest();
  contractId = await contractNft
    .connect(aliceSigner)
    .computeContractId.staticCall(
      alice.address,
      [bob.address, charlie.address],
      hashDigest,
      DEMO_AGREEMENT_IPFS_URL,
    );

  try {
    const cnftOwner = await contractNft.ownerOf(contractId);
    if (cnftOwner.toLowerCase() === alice.address.toLowerCase()) {
      console.log("Contract NFT already complete — skipping initContractAndSign", contractId.toString());
      contractMinted = true;
    }
  } catch {
    // not minted
  }

  if (!contractMinted) {
    const setupFee = await infoDesk.getValue(3);
    await (await feeToken.connect(aliceSigner).approve(contractNftAddr, setupFee)).wait();
    contractId = await contractNft
      .connect(aliceSigner)
      .initContractAndSign.staticCall([bob.address, charlie.address], hashDigest, DEMO_AGREEMENT_IPFS_URL);
    await (
      await contractNft
        .connect(aliceSigner)
        .initContractAndSign([bob.address, charlie.address], hashDigest, DEMO_AGREEMENT_IPFS_URL)
    ).wait();
    await (await contractNft.connect(bobSigner).signContract(contractId)).wait();
    await (await contractNft.connect(charlieSigner).signContract(contractId)).wait();
    contractMinted = true;
    console.log("Completed Contract NFT contractId:", contractId.toString());
  }

  return { machineTokenId, contractId, machineMinted, contractMinted };
}
