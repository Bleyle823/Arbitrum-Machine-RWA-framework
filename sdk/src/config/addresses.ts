import { getAddress } from "ethers";
import { Chain } from "../enums/core.js";
import { type RwaManifest, parseRwaManifest } from "../manifest.js";
import type { NetworkAddresses } from "../types/core.js";
import arbitrumSepolia from "../addresses/arbitrumSepolia.json";

function checksum(addr: string): string {
  return getAddress(addr);
}

export function manifestToAddresses(manifest: RwaManifest): NetworkAddresses {
  const m = manifest;
  if (!m.idFactory || !m.claimIssuer || !m.arbVaultFactory) {
    throw new Error(
      "Manifest missing idFactory, claimIssuer, or arbVaultFactory — run yarn sync-addresses after deploy",
    );
  }

  return {
    manifest: m,
    onchainid: {
      idFactory: checksum(m.idFactory),
      claimIssuer: checksum(m.claimIssuer),
    },
    nft: {
      arbRwaNft: checksum(m.arbRwaNft),
      machineNft: checksum(m.machineNft),
      contractNft: checksum(m.contractNft),
    },
    vault: {
      factory: checksum(m.arbVaultFactory),
      arbVault: checksum(m.arbVault),
      token: checksum(m.token),
      identityRegistry: checksum(m.identityRegistry),
      rewardDistributor: checksum(m.rewardDistributor),
      feeModule: checksum(m.feeModule),
      feeToken: checksum(m.feeToken),
    },
  };
}

const bundled: Partial<Record<Chain, RwaManifest>> = {
  [Chain.ARBITRUM_SEPOLIA]: parseRwaManifest(arbitrumSepolia),
};

export function getAddresses(chainId: number, manifestOverride?: RwaManifest): NetworkAddresses {
  const manifest = manifestOverride ?? bundled[chainId as Chain];
  if (!manifest) {
    throw new Error(
      `Unsupported chainId: ${chainId}. Pass manifest in SDKInit or run yarn sync-addresses.`,
    );
  }
  return manifestToAddresses(manifest);
}
