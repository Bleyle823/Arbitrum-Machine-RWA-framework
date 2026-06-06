import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const manifestSources = [
  path.resolve(root, "../frontend/packages/nextjs/public/rwa-manifest.json"),
  path.resolve(root, "../frontend/packages/hardhat/../nextjs/public/rwa-manifest.json"),
];

const deploymentDir = path.resolve(root, "../frontend/packages/hardhat/deployments/arbitrumSepolia");
const out = path.resolve(root, "src/addresses/arbitrumSepolia.json");

function readDeploymentAddress(name) {
  const file = path.join(deploymentDir, `${name}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")).address;
}

function main() {
  const src = manifestSources.find(p => fs.existsSync(p));
  if (!src) {
    console.error("No rwa-manifest.json found. Run bootstrap first or edit src/addresses/arbitrumSepolia.json manually.");
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(src, "utf8"));
  const framework = {
    idFactory: readDeploymentAddress("IdFactory"),
    claimIssuer: readDeploymentAddress("ClaimIssuer"),
    arbVaultFactory: readDeploymentAddress("ArbVaultFactory"),
  };

  for (const [key, value] of Object.entries(framework)) {
    if (value) json[key] = value;
  }

  fs.writeFileSync(out, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Synced ${src} → ${out}`);
  if (!framework.idFactory) {
    console.warn("Warning: IdFactory deployment not found — onchainid module needs idFactory in manifest.");
  }
}

main();
