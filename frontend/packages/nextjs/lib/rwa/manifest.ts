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

export async function fetchRwaManifest(): Promise<RwaManifest | null> {
  try {
    const res = await fetch("/rwa-manifest.json", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as RwaManifest;
  } catch {
    return null;
  }
}
