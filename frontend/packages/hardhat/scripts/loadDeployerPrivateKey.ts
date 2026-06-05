import { Wallet } from "ethers";
import password from "@inquirer/password";
import { normalizePrivateKey } from "../deploy-helpers/participantPrivateKeys.js";
import { readDeployerKeystoreJson, loadHardhatEnvFile, ENV_FILE } from "./deployerKeystore.js";

export { loadHardhatEnvFile, ENV_FILE } from "./deployerKeystore.js";

export function resolveNetworkName(argv: string[] = process.argv): string {
  const networkIndex = argv.indexOf("--network");
  return networkIndex !== -1 ? argv[networkIndex + 1] : "default";
}

export function isLocalHardhatNetwork(networkName: string): boolean {
  return networkName === "default" || networkName === "localhost" || networkName === "hardhat";
}

async function promptPassword(): Promise<string> {
  while (true) {
    const pass = await password({
      message: "Enter password to decrypt private key:",
      mask: true,
    });

    if (pass && pass.length > 0) {
      return pass;
    }

    console.log("Password cannot be empty. Try again (Ctrl+C to cancel).");
  }
}

/**
 * For live networks, set __RUNTIME_DEPLOYER_PRIVATE_KEY for hardhat.config.ts.
 */
export async function loadDeployerPrivateKey(argv: string[] = process.argv): Promise<string> {
  const networkName = resolveNetworkName(argv);

  if (isLocalHardhatNetwork(networkName)) {
    return networkName;
  }

  if (process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY) {
    return networkName;
  }

  const env = loadHardhatEnvFile();

  const plainKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY ?? env.DEPLOYER_PRIVATE_KEY);
  if (plainKey) {
    process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = plainKey;
    console.log("Using DEPLOYER_PRIVATE_KEY from packages/hardhat/.env");
    return networkName;
  }

  const encryptedKey = readDeployerKeystoreJson();
  if (!encryptedKey) {
    console.log(`🚫️ No deployer keystore in packages/hardhat/.secrets/ or .env`);
    console.log("   Run `yarn account:import` from frontend/, or add DEPLOYER_PRIVATE_KEY=0x... to packages/hardhat/.env");
    process.exit(1);
  }

  const noPrompt =
    process.env.NO_DEPLOY_PASSWORD_PROMPT === "true" ||
    process.env.CI === "true" ||
    process.env.SKIP_DEPLOY_PASSWORD_PROMPT === "true";

  const envPass = process.env.DEPLOY_PASSWORD ?? env.DEPLOY_PASSWORD;
  if (envPass !== undefined) {
    try {
      const wallet = await Wallet.fromEncryptedJson(encryptedKey, envPass);
      process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;
      console.log("Deployer wallet:", wallet.address);
      return networkName;
    } catch {
      console.error("Failed to decrypt private key with DEPLOY_PASSWORD from .env");
      process.exit(1);
    }
  }

  if (noPrompt) {
    console.error("Non-interactive mode: set DEPLOY_PASSWORD or DEPLOYER_PRIVATE_KEY in packages/hardhat/.env");
    process.exit(1);
  }

  while (true) {
    const pass = await promptPassword();
    try {
      const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
      process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;
      console.log("Deployer wallet:", wallet.address);
      return networkName;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("invalid json")) {
        console.error("Keystore JSON is corrupted — re-run: yarn account:import");
        process.exit(1);
      }
      console.log("Wrong password. Try again (Ctrl+C to cancel).");
    }
  }
}
