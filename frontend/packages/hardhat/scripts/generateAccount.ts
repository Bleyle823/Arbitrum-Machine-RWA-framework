import { ethers } from "ethers";
import { parse } from "envfile";
import * as fs from "fs";
import password from "@inquirer/password";
import { ENV_FILE, saveNewEncryptedKeystore } from "./deployerKeystore.js";

const getValidatedPassword = async () => {
  while (true) {
    const pass = await password({ message: "Enter a password to encrypt your private key:" });
    const confirmation = await password({ message: "Confirm password:" });

    if (pass === confirmation) {
      return pass;
    }
    console.log("❌ Passwords don't match. Please try again.");
  }
};

const setNewEnvConfig = async (existingEnvConfig = {}) => {
  console.log("👛 Generating new Wallet\n");
  const randomWallet = ethers.Wallet.createRandom();

  const pass = await getValidatedPassword();
  const encryptedJson = await randomWallet.encrypt(pass);

  saveNewEncryptedKeystore(encryptedJson, existingEnvConfig);
  console.log("\n📄 Encrypted keystore saved to packages/hardhat/.secrets/deployer.keystore.json");
  console.log("🪄 Generated wallet address:", randomWallet.address, "\n");
  console.log("⚠️ Make sure to remember your password! You'll need it to decrypt the private key.");
};

async function main() {
  if (!fs.existsSync(ENV_FILE)) {
    // No .env file yet.
    await setNewEnvConfig();
    return;
  }

  const existingEnvConfig = parse(fs.readFileSync(ENV_FILE).toString());
  if (existingEnvConfig.DEPLOYER_PRIVATE_KEY_ENCRYPTED || existingEnvConfig.DEPLOYER_KEYSTORE_FILE) {
    console.log("⚠️ You already have a deployer account. Check packages/hardhat/.env and .secrets/");
    return;
  }

  await setNewEnvConfig(existingEnvConfig);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
