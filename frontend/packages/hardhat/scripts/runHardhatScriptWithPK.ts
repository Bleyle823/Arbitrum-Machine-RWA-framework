import { spawn } from "child_process";
import { loadDeployerPrivateKey } from "./loadDeployerPrivateKey.js";

/**
 * Decrypt deployer key (live networks) then run: hardhat run <script> [args]
 *
 * Usage: tsx scripts/runHardhatScriptWithPK.ts scripts/bootstrapRwa.ts --network arbitrumSepolia
 */
async function main() {
  const args = process.argv.slice(2);
  const scriptPath = args[0];
  if (!scriptPath) {
    console.error("Usage: tsx scripts/runHardhatScriptWithPK.ts <hardhat-run-script> [--network <name>]");
    process.exit(1);
  }

  await loadDeployerPrivateKey(args);

  const hardhatArgs = ["run", scriptPath, ...args.slice(1)];

  const hardhat = spawn("hardhat", hardhatArgs, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  hardhat.on("exit", code => {
    process.exit(code || 0);
  });
}

main().catch(console.error);
