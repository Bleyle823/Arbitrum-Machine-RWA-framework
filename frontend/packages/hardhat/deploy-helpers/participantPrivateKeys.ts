import { Wallet, type Provider, type Signer } from "ethers";
import { loadHardhatEnvFile } from "../scripts/deployerKeystore.js";

/** Accepts `0x` + 64 hex or bare 64 hex (common .env mistake). */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return undefined;
  return `0x${hex}`;
}

function readPrivateKey(env: Record<string, string>, key: string): string | undefined {
  return normalizePrivateKey(process.env[key] ?? env[key]);
}

/**
 * Wallets for Alice / Bob / Charlie from packages/hardhat/.env (live networks).
 * Used by bootstrap and issue-claims when Hardhat does not own those accounts.
 */
export function loadParticipantWallets(
  provider: Provider,
  env: Record<string, string> = loadHardhatEnvFile(),
): { alice?: Wallet; bob?: Wallet; charlie?: Wallet } {
  const aliceKey = readPrivateKey(env, "ALICE_PRIVATE_KEY");
  const bobKey = readPrivateKey(env, "BOB_PRIVATE_KEY");
  const charlieKey = readPrivateKey(env, "CHARLIE_PRIVATE_KEY");

  const wallets = {
    alice: aliceKey ? new Wallet(aliceKey, provider) : undefined,
    bob: bobKey ? new Wallet(bobKey, provider) : undefined,
    charlie: charlieKey ? new Wallet(charlieKey, provider) : undefined,
  };

  const expectedAlice = (process.env.ALICE_ADDRESS ?? env.ALICE_ADDRESS)?.toLowerCase();
  const expectedBob = (process.env.BOB_ADDRESS ?? env.BOB_ADDRESS)?.toLowerCase();
  const expectedCharlie = (process.env.CHARLIE_ADDRESS ?? env.CHARLIE_ADDRESS)?.toLowerCase();

  if (wallets.alice && expectedAlice && wallets.alice.address.toLowerCase() !== expectedAlice) {
    console.warn("ALICE_PRIVATE_KEY does not match ALICE_ADDRESS — check .env");
  }
  if (wallets.bob && expectedBob && wallets.bob.address.toLowerCase() !== expectedBob) {
    console.warn("BOB_PRIVATE_KEY does not match BOB_ADDRESS — check .env");
  }
  if (wallets.charlie && expectedCharlie && wallets.charlie.address.toLowerCase() !== expectedCharlie) {
    console.warn("CHARLIE_PRIVATE_KEY does not match CHARLIE_ADDRESS — check .env");
  }

  return wallets;
}

export async function signerForParticipantAddress(
  provider: Provider,
  hardhatSigners: Signer[],
  address: string,
): Promise<Signer | null> {
  const lower = address.toLowerCase();
  for (const signer of hardhatSigners) {
    if ((await signer.getAddress()).toLowerCase() === lower) return signer;
  }

  const wallets = loadParticipantWallets(provider);
  for (const wallet of [wallets.alice, wallets.bob, wallets.charlie]) {
    if (wallet && wallet.address.toLowerCase() === lower) return wallet;
  }

  return null;
}
