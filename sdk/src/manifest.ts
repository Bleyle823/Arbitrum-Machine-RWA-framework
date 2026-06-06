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
  /** Framework contracts (synced from Hardhat deployments). */
  idFactory?: string;
  claimIssuer?: string;
  arbVaultFactory?: string;
  machineTokenId: string;
  contractId: string;
  assetSerial?: string;
  dealReference?: string;
  machineDidUri?: string;
  machineValueWei?: string;
  agreementMetadataHash?: string;
  agreementUrl?: string;
  /** @deprecated use dealReference */
  hashLabel?: string;
  alice: string;
  bob: string;
  charlie: string;
  admin: string;
};

export type RwaManifestInput = RwaManifest | string | Record<string, unknown>;

export function parseRwaManifest(input: RwaManifestInput): RwaManifest {
  const raw = typeof input === "string" ? (JSON.parse(input) as Record<string, unknown>) : input;
  const m = raw as RwaManifest;
  if (!m.chainId || !m.machineNft || !m.arbVault || !m.token) {
    throw new Error("Invalid RWA manifest: missing chainId, machineNft, arbVault, or token");
  }
  return m;
}

export async function fetchRwaManifest(url: string): Promise<RwaManifest | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return parseRwaManifest((await res.json()) as RwaManifest);
  } catch {
    return null;
  }
}

export function manifestContractId(manifest: RwaManifest): bigint | undefined {
  if (!manifest.contractId || manifest.contractId === "0") return undefined;
  return BigInt(manifest.contractId);
}

export function manifestMachineTokenId(manifest: RwaManifest): bigint {
  return BigInt(manifest.machineTokenId || "202604042");
}
