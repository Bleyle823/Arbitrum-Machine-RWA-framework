import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.resolve(import.meta.dirname, "../.."),
  path.resolve(import.meta.dirname, "../../docs"),
  path.resolve(import.meta.dirname, "../../contracts"),
];
const OLD = "@arbitrum-machine/rwa-sdk";
const NEW = "arbitrum-machine-rwa-sdk";
const SKIP = new Set(["node_modules", ".git", "dist", "artifacts", "cache"]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(mdx?|md|ts|tsx|json)$/i.test(name) && name !== "package-lock.json") out.push(p);
  }
  return out;
}

let n = 0;
const files = new Set();
for (const root of ROOTS) {
  if (fs.existsSync(root)) for (const file of walk(root)) files.add(file);
}
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.includes(OLD)) continue;
  fs.writeFileSync(file, raw.replaceAll(OLD, NEW), "utf8");
  n++;
  console.log(file);
}

// package-lock.json name fields only
const lock = path.join(ROOT, "sdk/package-lock.json");
const lockRaw = fs.readFileSync(lock, "utf8");
if (lockRaw.includes(OLD)) {
  fs.writeFileSync(lock, lockRaw.replaceAll(OLD, NEW), "utf8");
  n++;
  console.log(lock);
}

console.log(`Updated ${n} files.`);
