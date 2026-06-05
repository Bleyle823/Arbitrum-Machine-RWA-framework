import { spawn } from "child_process";
import { loadDeployerPrivateKey } from "./loadDeployerPrivateKey.js";

/**
 * Unencrypts the private key and runs the hardhat deploy command,
 * then generates TypeScript ABIs for the frontend.
 */
async function main() {
  await loadDeployerPrivateKey();

  // Run hardhat deploy (compilation already handled by the npm script)
  const deployArgs = ["deploy", "--no-compile", "--skip-prompts", ...process.argv.slice(2)];

  const hardhat = spawn("hardhat", deployArgs, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  hardhat.on("exit", code => {
    process.exit(code || 0);
  });
}

main().catch(console.error);
