#!/usr/bin/env node
/**
 * Replace em dashes (—) in documentation with colons, commas, or parentheses.
 * Usage: node scripts/strip-em-dashes.mjs [file-or-dir ...]
 */
import fs from "node:fs";
import path from "node:path";

const EM = "\u2014";

function transform(text) {
  let s = text;

  // Code / table placeholders first
  s = s.replaceAll(`"${EM}"`, '"(none)"');
  s = s.replaceAll(`| ${EM} |`, "| n/a |");

  // Tight parenthetical pairs (no spaces around em dash)
  s = s.replaceAll(
    "assets—chiefly machines—as",
    "assets (chiefly machines) as",
  );

  // Phrases where a colon reads wrong
  s = s.replaceAll("lifecycle — or", "lifecycle, or");
  s = s.replaceAll("machine — with yield", "machine, with yield");
  s = s.replaceAll("policy — without", "policy, without");
  s = s.replaceAll("admin / —", "admin / n/a");
  s = s.replaceAll("vault taker — e.g.", "vault taker, e.g.");
  s = s.replaceAll(
    "equipment — farms, robots, logistics assets, compute nodes — is",
    "equipment (farms, robots, logistics assets, compute nodes) is",
  );
  s = s.replaceAll(
    "participants — people, companies, protocols, and increasingly autonomous agents — can",
    "participants (people, companies, protocols, and increasingly autonomous agents) can",
  );
  s = s.replaceAll(
    "objects — collateral, income streams, and portfolio building blocks — not",
    "objects (collateral, income streams, and portfolio building blocks), not",
  );
  s = s.replaceAll(
    "context — leasing, financing, operating agreements — attaches",
    "context (leasing, financing, operating agreements) attaches",
  );
  s = s.replaceAll(
    "**interact with contracts directly** — Hardhat scripts, `ethers`, Arbiscan, or the `/rwa` UI — rather than",
    "**interact with contracts directly** (Hardhat scripts, `ethers`, Arbiscan, or the `/rwa` UI) rather than",
  );
  s = s.replaceAll(
    "transfers, and yield — all via direct",
    "transfers, and yield, all via direct",
  );
  s = s.replaceAll(
    "flexible** — leasing",
    "flexible**; leasing",
  );
  s = s.replaceAll(
    "drains accrued rewards — deposit again",
    "drains accrued rewards; deposit again",
  );
  s = s.replaceAll(
    "already in vault — skip",
    "already in vault; skip",
  );
  s = s.replaceAll(
    "Identity Registry — not immediately",
    "Identity Registry, not immediately",
  );
  s = s.replaceAll(
    "switch wallets — no",
    "switch wallets; no",
  );
  s = s.replaceAll(
    "npm in `sdk/`** — not Yarn",
    "npm in `sdk/`**, not Yarn",
  );

  // Headings: Phase / Track / Step / Terminal / Part / Section / title
  s = s.replace(new RegExp(`^(# [^\\n]+?) ${EM} `, "gm"), "$1: ");
  s = s.replace(
    new RegExp(`^(#{1,6} Phase \\d+) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`^(#{1,6} Track [A-Z0-9]+) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`^(#{1,6} Step [\\d.]+[a-z]?) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`^(#{1,6} Part \\d+) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`^(#{1,6} Section \\d+) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`^(#{1,6} Checkpoint) ${EM} `, "gm"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`(\\*\\*Terminal \\d+\\*\\*) ${EM} `, "g"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`(\\*\\*Phase [AB]\\*) ${EM} `, "g"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`(\\*\\*Optional) ${EM} `, "g"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`Option ([ABC]) ${EM} `, "g"),
    "Option $1: ",
  );
  s = s.replace(
    new RegExp(`\\*\\*([A-C]) ${EM} `, "g"),
    "**$1: ",
  );

  // Comment lines: # optional — foo
  s = s.replace(
    new RegExp(`(# optional) ${EM} `, "g"),
    "$1: ",
  );
  s = s.replace(
    new RegExp(`(# once) ${EM} `, "g"),
    "$1: ",
  );

  // Remaining spaced em dashes → colon (list labels, descriptions, links)
  s = s.replaceAll(` ${EM} `, ": ");

  // Any leftover em dashes
  s = s.replaceAll(EM, ", ");

  return s;
}

function walk(dir, out = []) {
  const skip = new Set([
    "node_modules",
    ".git",
    "dist",
    "artifacts",
    "cache",
    "typechain-types",
    ".agents",
  ]);
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(mdx?|md)$/i.test(name)) out.push(p);
  }
  return out;
}

function processFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.includes(EM)) return false;
  const next = transform(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    return true;
  }
  return false;
}

const roots = process.argv.slice(2);
const defaultRoots = [
  path.resolve("sdk/mintlify"),
  path.resolve("docs/mintlify"),
  path.resolve("sdk/sdk_reference"),
  path.resolve("sdk"),
  path.resolve("contracts"),
  path.resolve("README.md"),
  path.resolve("ARBITRUM_TEST_GUIDE.md"),
  path.resolve("RUN_GUIDE.md"),
];

const targets =
  roots.length > 0
    ? roots.map((r) => path.resolve(r))
    : defaultRoots;

let changed = 0;
for (const root of targets) {
  if (!fs.existsSync(root)) continue;
  const files = fs.statSync(root).isDirectory() ? walk(root) : [root];
  for (const file of files) {
    if (processFile(file)) {
      changed++;
      console.log("updated:", path.relative(process.cwd(), file));
    }
  }
}

console.log(`Done. ${changed} file(s) updated.`);
