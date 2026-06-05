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

const getWalletFromPrivateKey = async () => {
  while (true) {
    const privateKey = await password({ message: "Paste your private key:" });
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log("❌ Invalid private key format. Please try again.");
    }
  }
};

const setNewEnvConfig = async (existingEnvConfig = {}) => {
  console.log("👛 Importing Wallet\n");

  const wallet = await getWalletFromPrivateKey();

  const pass = await getValidatedPassword();
  const encryptedJson = await wallet.encrypt(pass);

  saveNewEncryptedKeystore(encryptedJson, existingEnvConfig);
  console.log("\n📄 Encrypted keystore saved to packages/hardhat/.secrets/deployer.keystore.json");
  console.log("🪄 Imported wallet address:", wallet.address, "\n");
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
