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
    alice: Signer;
    bob: Signer;
    charlie: Signer;
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
    seedDemoAssets = true,
  } = params;

  console.log("\n--- Debug bootstrap: identities + claims ---");
  const identities = await issueParticipantClaims(idFactoryAddr, claimIssuerAddr, admin, alice, bob, charlie);

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

  const attachTx = await vaultFactory.attachVaultPeers(
    tokenAddr,
    await alice.getAddress(),
    feeTokenAddr,
    complianceModules,
  );
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

  for (const [user, identity] of [
    [alice, identities.aliceIdentity],
    [bob, identities.bobIdentity],
    [charlie, identities.charlieIdentity],
  ] as const) {
    await (await ir.registerIdentity(await user.getAddress(), identity, 276)).wait();
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

  if (seedDemoAssets) {
    console.log("\n--- Debug bootstrap: demo Machine NFT + Contract NFT for Alice ---");
    const feeToken = await ethers.getContractAt("MockFeeToken", feeTokenAddr);
    const machineNft = await ethers.getContractAt("MachineNft", machineNftAddr);
    const contractNft = await ethers.getContractAt("ContractNft", contractNftAddr);

    const machineValue = DEMO_MACHINE_VALUE;
    const [fee] = await machineNft.registrationFeeAndAccount(machineValue);
    await (await feeToken.connect(alice).approve(machineNftAddr, fee)).wait();
    const did = demoMachineDidBytes();
    await (
      await machineNft.connect(admin).registerMachine(await alice.getAddress(), machineValue, machineTokenId, did)
    ).wait();

    const setupFee = await infoDesk.getValue(3);
    await (await feeToken.connect(alice).approve(contractNftAddr, setupFee)).wait();
    const hashDigest = demoAgreementHashDigest();
    contractId = await contractNft
      .connect(alice)
      .initContractAndSign.staticCall(
        [await bob.getAddress(), await charlie.getAddress()],
        hashDigest,
        DEMO_AGREEMENT_IPFS_URL,
      );
    await (
      await contractNft
        .connect(alice)
        .initContractAndSign(
          [await bob.getAddress(), await charlie.getAddress()],
          hashDigest,
          DEMO_AGREEMENT_IPFS_URL,
        )
    ).wait();
    await (await contractNft.connect(bob).signContract(contractId)).wait();
    await (await contractNft.connect(charlie).signContract(contractId)).wait();

    console.log("Demo assetSerial → machineTokenId:", machineTokenId.toString());
    console.log("Demo dealRef / agreementUrl:", DEMO_AGREEMENT_IPFS_URL);
    console.log("Demo contractId:", contractId.toString());
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
