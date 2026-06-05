import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { DebugBootstrapResult } from "./debugBootstrap.js";

export type RwaManifest = {
  chainId: number;
  machineNft: string;
  contractNft: string;
  arbVault: string;
  token: string;
  rewardDistributor: string;
  identityRegistry: string;
  feeToken: string;
  feeModule: string;
  arbRwaNft: string;
  machineTokenId: string;
  contractId: string;
  assetSerial: string;
  dealReference: string;
  machineDidUri: string;
  machineValueWei: string;
  agreementMetadataHash: string;
  agreementUrl: string;
  alice: string;
  bob: string;
  charlie: string;
  admin: string;
};

export function writeRwaManifest(
  demo: DebugBootstrapResult,
  extras: {
    chainId: number;
    feeToken: string;
    feeModule: string;
    arbRwaNft: string;
    assetSerial: string;
    dealReference: string;
    machineDidUri: string;
    machineValueWei: string;
    agreementMetadataHash: string;
    agreementUrl: string;
    alice: string;
    bob: string;
    charlie: string;
    admin: string;
  },
): RwaManifest {
  const manifest: RwaManifest = {
    chainId: extras.chainId,
    machineNft: demo.machineNftAddr,
    contractNft: demo.contractNftAddr,
    arbVault: demo.vaultAddr,
    token: demo.tokenAddr,
    rewardDistributor: demo.distributorAddr,
    identityRegistry: demo.identityRegistryAddr,
    feeToken: extras.feeToken,
    feeModule: extras.feeModule,
    arbRwaNft: extras.arbRwaNft,
    machineTokenId: demo.machineTokenId.toString(),
    contractId: demo.contractId.toString(),
    assetSerial: extras.assetSerial,
    dealReference: extras.dealReference,
    machineDidUri: extras.machineDidUri,
    machineValueWei: extras.machineValueWei,
    agreementMetadataHash: extras.agreementMetadataHash,
    agreementUrl: extras.agreementUrl,
    alice: extras.alice,
    bob: extras.bob,
    charlie: extras.charlie,
    admin: extras.admin,
  };

  return persistRwaManifest(manifest);
}

function persistRwaManifest(manifest: RwaManifest): RwaManifest {
  const hardhatDir = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(hardhatDir, "../../nextjs/public/rwa-manifest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log("\nWrote rwa-manifest.json →", outPath);
  console.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

const ZERO = "0x0000000000000000000000000000000000000000";

type ManifestExtras = {
  chainId: number;
  feeToken: string;
  feeModule: string;
  arbRwaNft: string;
  assetSerial: string;
  dealReference: string;
  machineDidUri: string;
  machineValueWei: string;
  agreementMetadataHash: string;
  agreementUrl: string;
  alice: string;
  bob: string;
  charlie: string;
  admin: string;
};

/** Framework-only manifest after live-network deploy (no demo vault/NFT bootstrap). */
export function writeFrameworkRwaManifest(extras: ManifestExtras): RwaManifest {
  return persistRwaManifest({
    chainId: extras.chainId,
    machineNft: ZERO,
    contractNft: ZERO,
    arbVault: ZERO,
    token: ZERO,
    rewardDistributor: ZERO,
    identityRegistry: ZERO,
    feeToken: extras.feeToken,
    feeModule: extras.feeModule,
    arbRwaNft: extras.arbRwaNft,
    machineTokenId: "202604042",
    contractId: "0",
    assetSerial: extras.assetSerial,
    dealReference: extras.dealReference,
    machineDidUri: extras.machineDidUri,
    machineValueWei: extras.machineValueWei,
    agreementMetadataHash: extras.agreementMetadataHash,
    agreementUrl: extras.agreementUrl,
    alice: extras.alice,
    bob: extras.bob,
    charlie: extras.charlie,
    admin: extras.admin,
  });
}
