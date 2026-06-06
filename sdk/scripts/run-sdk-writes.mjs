/**
 * Run SDK write steps 7–10 on Arbitrum Sepolia (approve → mint → transfer → yield).
 *
 * Prerequisites: bootstrap already completed (steps 1–6 on-chain).
 * Requires sdk/.env with ALICE_PRIVATE_KEY, BOB_PRIVATE_KEY, CHARLIE_PRIVATE_KEY.
 *
 *   npm run build
 *   npm run writes
 *
 * Single step: node scripts/run-sdk-writes.mjs --step 9
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JsonRpcProvider, Wallet, parseEther, Contract, getAddress } from "ethers";
import {
  RWA,
  Chain,
  manifestMachineTokenId,
  manifestContractId,
  DEFAULT_VAULT_MINT_AMOUNT,
} from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function requireKey(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in sdk/.env (copy from .env.example)`);
  return v;
}

function stepArg() {
  const i = process.argv.indexOf("--step");
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : undefined;
}

const erc721ReadAbi = [
  "function ownerOf(uint256) view returns (address)",
  "function getApproved(uint256) view returns (address)",
];

async function needsNftApproval(provider, nft, tokenId, vault) {
  const contract = new Contract(nft, erc721ReadAbi, provider);
  const vaultAddr = getAddress(vault);
  const owner = getAddress(await contract.ownerOf(tokenId));
  if (owner === vaultAddr) return false;
  const approved = getAddress(await contract.getApproved(tokenId));
  return approved !== vaultAddr;
}

async function tryClaim(label, fn) {
  try {
    await fn();
    console.log(label);
    return true;
  } catch (err) {
    const reason = err?.cause?.reason ?? err?.message ?? "";
    if (String(reason).includes("Nothing to claim")) {
      console.log(`${label} — nothing to claim, skip`);
      return false;
    }
    throw err;
  }
}

async function main() {
  loadEnvFile();
  const onlyStep = stepArg();
  const rpc = process.env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
  const provider = new JsonRpcProvider(rpc);
  const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });
  const m = sdk.getManifest();

  const alice = new Wallet(requireKey("ALICE_PRIVATE_KEY"), provider);
  const bob = new Wallet(requireKey("BOB_PRIVATE_KEY"), provider);
  const charlie = new Wallet(requireKey("CHARLIE_PRIVATE_KEY"), provider);

  const machineId = manifestMachineTokenId(m);
  const contractId = manifestContractId(m);
  const vault = m.arbVault;
  const transferAmt = parseEther("10");

  const run = async (n, fn) => {
    if (onlyStep !== undefined && onlyStep !== n) return;
    console.log(`\n--- Step ${n} ---`);
    await fn();
  };

  await run(7, async () => {
    const pairs = [
      [m.machineNft, machineId, "Machine"],
      ...(contractId ? [[m.contractNft, contractId, "Contract"]] : []),
    ];
    for (const [nft, tokenId, label] of pairs) {
      if (!(await needsNftApproval(provider, nft, tokenId, vault))) {
        console.log(`${label} NFT already approved or owned by vault — skip`);
        continue;
      }
      await sdk.vault.nftApproval({
        owner: alice,
        nft,
        vault,
        tokenIds: [tokenId],
      });
      console.log(`${label} NFT approval submitted`);
    }
  });

  await run(8, async () => {
    const minted = await sdk.vault.isMinted();
    if (minted) {
      console.log("Vault already minted — skipping depositAndMint");
      return;
    }
    if (!contractId) throw new Error("manifest contractId missing — cannot mint with CNFT");
    const result = await sdk.vault.depositAndMint({
      vaultController: alice,
      tokenIds: [machineId, contractId],
      amount: DEFAULT_VAULT_MINT_AMOUNT,
    });
    console.log("depositAndMint:", result.status, result.amount.toString());
  });

  await run(9, async () => {
    await sdk.vault.ensureTransferFeeAllowance({
      allowanceSigner: alice,
      transferAmount: transferAmt,
    });
    for (const [label, to] of [
      ["Bob", m.bob],
      ["Charlie", m.charlie],
    ]) {
      const result = await sdk.vault.transfer({
        from: alice,
        to,
        amount: transferAmt,
      });
      console.log(`transfer → ${label}:`, result.status, result.amount.toString());
    }
  });

  await run(10, async () => {
    const yieldAmt = parseEther("1");

    await sdk.vault.depositYield({ depositor: alice, amount: yieldAmt });
    console.log("yield deposited (1/2)");
    await tryClaim("Bob claimed yield to himself", () => sdk.vault.claimYield({ claimant: bob }));

    // claim() drains Bob's accrued balance — deposit again before claimYieldTo
    await sdk.vault.depositYield({ depositor: alice, amount: yieldAmt });
    console.log("yield deposited (2/2)");
    await tryClaim("Bob claimed yield to Charlie", () =>
      sdk.vault.claimYieldTo({ claimant: bob, to: m.charlie }),
    );
  });

  console.log("\nDone. Run: npm run verify:workflow");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
