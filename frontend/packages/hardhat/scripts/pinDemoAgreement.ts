/**
 * Pin packages/nextjs/public/demo-agreement-metadata.json to IPFS (Pinata).
 *
 *   yarn pin:demo-agreement
 *
 * Tries, in order: pinByHash (precomputed CID) → SDK public upload → pinJSONToIPFS → pinFileToIPFS.
 * CID must match DEMO_AGREEMENT_IPFS_CID in deploy-helpers/demoProductionAssets.ts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseEnvFile } from "envfile";
import { PinataSDK } from "pinata";
import { DEMO_AGREEMENT_IPFS_CID } from "../deploy-helpers/demoProductionAssets.js";
import { loadHardhatEnvFile } from "./deployerKeystore.js";

const HARDHAT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.resolve(HARDHAT_ROOT, "../nextjs/public/demo-agreement-metadata.json");
const NEXT_ENV_LOCAL = path.resolve(HARDHAT_ROOT, "../nextjs/.env.local");

function loadPinataEnv(): { jwt?: string; gateway?: string } {
  loadHardhatEnvFile();
  if (fs.existsSync(NEXT_ENV_LOCAL)) {
    const parsed = parseEnvFile(fs.readFileSync(NEXT_ENV_LOCAL, "utf8")) as Record<string, string>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") process.env[key] = value;
    }
  }
  return {
    jwt: process.env.PINATA_JWT,
    gateway: process.env.NEXT_PUBLIC_GATEWAY_URL ?? process.env.PINATA_GATEWAY_URL,
  };
}

function pinataScopeHelp(): string {
  return [
    "Your Pinata JWT has no pinning scopes (NO_SCOPES_FOUND).",
    "",
    "Create a new API key at https://app.pinata.cloud/developers/keys with at least one of:",
    "  • pinByHash (recommended — pins the precomputed demo CID)",
    "  • pinJSONToIPFS or pinFileToIPFS (legacy pinning API)",
    "  • Or a key with Public / Upload access (SDK upload.public.file)",
    "",
    "Do not use a key with zero endpoint permissions. Admin keys include all scopes.",
    "Set PINATA_JWT in packages/hardhat/.env (and NEXT_PUBLIC_GATEWAY_URL for gateway links).",
  ].join("\n");
}

async function pinByHash(jwt: string, cid: string): Promise<boolean> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinByHash", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hashToPin: cid,
      pinataMetadata: { name: "arbitrum-rwa-demo-agreement" },
    }),
  });
  if (res.ok) {
    console.log("Pinned via pinByHash:", cid);
    return true;
  }
  const text = await res.text();
  if (!text.includes("NO_SCOPES_FOUND")) {
    console.log("pinByHash:", text);
  }
  return false;
}

async function uploadViaSdk(jwt: string, gateway: string | undefined): Promise<string | null> {
  const raw = fs.readFileSync(JSON_PATH);
  const pinata = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway ?? "gateway.pinata.cloud",
  });
  const file = new File([raw], "demo-agreement-metadata.json", { type: "application/json" });
  const { cid } = await pinata.upload.public.file(file);
  console.log("Uploaded via Pinata SDK (public.file):", cid);
  return cid;
}

async function pinJsonToIpfs(jwt: string): Promise<string | null> {
  const body = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: body,
      pinataMetadata: { name: "arbitrum-rwa-demo-agreement" },
      pinataOptions: { cidVersion: 1 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (!text.includes("NO_SCOPES_FOUND")) console.log("pinJSONToIPFS:", text);
    return null;
  }
  const json = (await res.json()) as { IpfsHash: string };
  console.log("Pinned via pinJSONToIPFS:", json.IpfsHash);
  return json.IpfsHash;
}

async function pinFileToIpfs(jwt: string): Promise<string | null> {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(JSON_PATH)]), "demo-agreement-metadata.json");
  form.append(
    "pinataMetadata",
    new Blob([JSON.stringify({ name: "arbitrum-rwa-demo-agreement" })], { type: "application/json" }),
  );
  form.append("pinataOptions", new Blob([JSON.stringify({ cidVersion: 1 })], { type: "application/json" }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("NO_SCOPES_FOUND")) return null;
    console.log("pinFileToIPFS:", text);
    return null;
  }
  const json = (await res.json()) as { IpfsHash: string };
  console.log("Pinned via pinFileToIPFS:", json.IpfsHash);
  return json.IpfsHash;
}

async function main() {
  const { jwt, gateway } = loadPinataEnv();
  if (!jwt) {
    console.error("Set PINATA_JWT in packages/hardhat/.env or packages/nextjs/.env.local");
    process.exit(1);
  }
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Missing ${JSON_PATH}`);
  }

  console.log("Target CID:", DEMO_AGREEMENT_IPFS_CID);

  if (await pinByHash(jwt, DEMO_AGREEMENT_IPFS_CID)) {
    printSuccess(DEMO_AGREEMENT_IPFS_CID, gateway);
    return;
  }

  let cid: string | null = null;
  try {
    cid = await uploadViaSdk(jwt, gateway);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("NO_SCOPES")) console.log("SDK upload:", msg);
  }

  if (!cid) cid = await pinJsonToIpfs(jwt);
  if (!cid) cid = await pinFileToIpfs(jwt);

  if (!cid) {
    console.error("\n" + pinataScopeHelp());
    process.exit(1);
  }

  if (cid !== DEMO_AGREEMENT_IPFS_CID) {
    console.warn(
      "\nCID mismatch: Pinata returned a different CID than ipfs-only-hash for the local file.",
      "\nEither update DEMO_AGREEMENT_IPFS_CID in demoProductionAssets.ts and re-bootstrap,",
      "\nor enable pinByHash on your API key to pin the precomputed CID.",
    );
  }

  printSuccess(cid, gateway);
}

function printSuccess(cid: string, gateway?: string) {
  console.log("\nGateway links:");
  console.log("  https://ipfs.io/ipfs/" + cid);
  console.log("  https://dweb.link/ipfs/" + cid);
  if (gateway) {
    const host = gateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
    console.log("  https://" + host + "/ipfs/" + cid);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
