import { ARBITRUM_SEPOLIA_CHAIN_ID } from "../constants.js";
import { type RwaManifest, parseRwaManifest } from "../manifest.js";
import arbitrumSepolia from "./arbitrumSepolia.json";

/** Known manifests keyed by chain id (demo / reference deployments). */
export const deploymentsByChainId: Record<number, RwaManifest> = {
  [ARBITRUM_SEPOLIA_CHAIN_ID]: parseRwaManifest(arbitrumSepolia),
};

export function getDeployment(chainId: number): RwaManifest | undefined {
  return deploymentsByChainId[chainId];
}

export function requireDeployment(chainId: number): RwaManifest {
  const d = getDeployment(chainId);
  if (!d) {
    throw new Error(`No bundled deployment for chainId ${chainId}. Pass a custom manifest or run yarn sync-addresses.`);
  }
  return d;
}

export { arbitrumSepolia };
