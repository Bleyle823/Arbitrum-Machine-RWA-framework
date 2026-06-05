import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const sources = [
  path.resolve(root, "../frontend/packages/nextjs/public/rwa-manifest.json"),
  path.resolve(root, "../frontend/packages/hardhat/../nextjs/public/rwa-manifest.json"),
];

const out = path.resolve(root, "src/addresses/arbitrumSepolia.json");

function main() {
  const src = sources.find(p => fs.existsSync(p));
  if (!src) {
    console.error("No rwa-manifest.json found. Run bootstrap first or edit src/addresses/arbitrumSepolia.json manually.");
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(src, "utf8"));
  fs.writeFileSync(out, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Synced ${src} → ${out}`);
}

main();
