import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseEnvFile, stringify as stringifyEnvFile } from "envfile";

export const HARDHAT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ENV_FILE = path.join(HARDHAT_ROOT, ".env");
export const KEYSTORE_FILE = path.join(HARDHAT_ROOT, ".secrets", "deployer.keystore.json");
export const KEYSTORE_ENV_KEY = "DEPLOYER_KEYSTORE_FILE";
export const KEYSTORE_ENV_VALUE = ".secrets/deployer.keystore.json";

/** Load packages/hardhat/.env regardless of shell cwd. */
export function loadHardhatEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_FILE)) {
    return {};
  }
  const parsed = parseEnvFile(fs.readFileSync(ENV_FILE, "utf8")) as Record<string, string>;
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }
  return parsed;
}

/** envfile splits on commas — inline JSON keystore in .env is always truncated. */
export function readKeystoreJsonFromEnvLine(): string | null {
  if (!fs.existsSync(ENV_FILE)) return null;

  const prefix = "DEPLOYER_PRIVATE_KEY_ENCRYPTED=";
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    if (!line.startsWith(prefix)) continue;
    const json = line.slice(prefix.length).trim();
    if (json.startsWith("{") && json.includes("ciphertext")) {
      return json;
    }
  }
  return null;
}

export function readDeployerKeystoreJson(): string | null {
  if (fs.existsSync(KEYSTORE_FILE)) {
    const json = fs.readFileSync(KEYSTORE_FILE, "utf8").trim();
    if (json.startsWith("{") && json.includes("ciphertext")) return json;
  }

  const inline = readKeystoreJsonFromEnvLine();
  if (inline) {
    writeDeployerKeystoreFile(inline);
    updateEnvForKeystoreFile();
    console.log("Migrated deployer keystore to", KEYSTORE_FILE);
    return inline;
  }

  if (!fs.existsSync(ENV_FILE)) return null;
  const parsed = parseEnvFile(fs.readFileSync(ENV_FILE, "utf8")) as Record<string, string>;
  const broken = parsed.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (broken?.startsWith("{") && broken.includes("ciphertext")) {
    return broken;
  }

  return null;
}

export function writeDeployerKeystoreFile(encryptedJson: string): void {
  fs.mkdirSync(path.dirname(KEYSTORE_FILE), { recursive: true });
  fs.writeFileSync(KEYSTORE_FILE, encryptedJson, "utf8");
}

export function updateEnvForKeystoreFile(existing: Record<string, string> = {}): void {
  const next: Record<string, string> = { ...existing };
  delete next.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  next[KEYSTORE_ENV_KEY] = KEYSTORE_ENV_VALUE;

  if (fs.existsSync(ENV_FILE)) {
    const parsed = parseEnvFile(fs.readFileSync(ENV_FILE, "utf8")) as Record<string, string>;
    Object.assign(next, parsed);
    delete next.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
    next[KEYSTORE_ENV_KEY] = KEYSTORE_ENV_VALUE;
  }

  fs.writeFileSync(ENV_FILE, stringifyEnvFile(next));
}

export function saveNewEncryptedKeystore(encryptedJson: string, existingEnv: Record<string, string> = {}): void {
  writeDeployerKeystoreFile(encryptedJson);
  updateEnvForKeystoreFile(existingEnv);
}
