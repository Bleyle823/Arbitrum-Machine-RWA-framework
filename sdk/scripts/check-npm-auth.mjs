#!/usr/bin/env node
import { execSync } from "node:child_process";

try {
  const user = execSync("npm whoami", { encoding: "utf8" }).trim();
  console.log(`npm: logged in as ${user}`);
} catch {
  console.error(`
npm publish failed: you are not logged in (or your token is expired).

Fix:
  1. npm logout
  2. npm login
  3. cd sdk && npm publish

If you prefer the scoped name @arbitrum-machine/rwa-sdk, create the org first:
  https://www.npmjs.com/org/create
  (org name: arbitrum-machine)
`);
  process.exit(1);
}
