import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

const defaultManifestSources = [
  path.resolve(root, "../frontend/packages/nextjs/public/rwa-manifest.json"),
  path.resolve(root, "../contracts/deployments/deployment-421614.json"),
];

const manifestArg = argValue("--manifest");
const deploymentsArg = argValue("--deployments");
const outArg = argValue("--out");

const deploymentDir =
  deploymentsArg ??
  path.resolve(root, "../frontend/packages/hardhat/deployments/arbitrumSepolia");
const out = outArg ? path.resolve(root, outArg) : path.resolve(root, "src/addresses/arbitrumSepolia.json");

function readDeploymentAddress(name) {
  const file = path.join(deploymentDir, `${name}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")).address;
}

function resolveManifestSource() {
  if (manifestArg) {
    const p = path.resolve(manifestArg);
    if (!fs.existsSync(p)) {
      console.error(`Manifest not found: ${p}`);
      process.exit(1);
    }
    return p;
  }
  const found = defaultManifestSources.find(p => fs.existsSync(p));
  if (found) return found;
  const bundled = path.resolve(root, "src/addresses/arbitrumSepolia.json");
  if (fs.existsSync(bundled)) {
    console.warn("No external rwa-manifest.json — refreshing bundled file with deployment addresses only.");
    return bundled;
  }
  console.error(
    "No manifest found. Pass --manifest path/to/rwa-manifest.json or copy one into src/addresses/arbitrumSepolia.json",
  );
  process.exit(1);
}

function main() {
  const src = resolveManifestSource();
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
  if (!framework.idFactory && fs.existsSync(deploymentDir)) {
    console.warn("Warning: IdFactory deployment JSON not found in", deploymentDir);
  } else if (!fs.existsSync(deploymentDir)) {
    console.warn("Warning: deployments dir missing — only manifest fields were copied:", deploymentDir);
  }
}

main();
