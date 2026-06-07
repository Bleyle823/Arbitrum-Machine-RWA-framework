import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Hardhat package root (`packages/hardhat`), independent of process.cwd(). */
export function hardhatPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function deploymentJsonPath(networkName: string, contractName: string): string {
  return path.join(hardhatPackageRoot(), "deployments", networkName, `${contractName}.json`);
}

export function readDeploymentAddress(
  contractName: string,
  networkNames: string[],
): string | null {
  for (const networkName of networkNames) {
    const file = deploymentJsonPath(networkName, contractName);
    if (!fs.existsSync(file)) continue;
    return JSON.parse(fs.readFileSync(file, "utf8")).address as string;
  }
  return null;
}

export function activeNetworkName(argv = process.argv): string {
  const idx = argv.indexOf("--network");
  return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : "default";
}

export function deploymentNetworkOrder(argv = process.argv): string[] {
  const active = activeNetworkName(argv);
  return [...new Set([active, "robinhoodChainTestnet", "arbitrumSepolia", "default", "localhost"])];
}
