/**
 * Live workflow verification on Arbitrum Sepolia (read-only).
 * Run: node scripts/verify-workflow.mjs
 */
import { JsonRpcProvider, Contract } from "ethers";
import { RWA, Chain, manifestMachineTokenId, manifestContractId } from "../dist/index.js";

const RPC = process.env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

function ok(label, pass, detail = "") {
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

async function main() {
  console.log("Arbitrum Sepolia RWA SDK — workflow verification\n");
  console.log("RPC:", RPC);

  const provider = new JsonRpcProvider(RPC);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Chain.ARBITRUM_SEPOLIA) {
    console.warn(`Warning: connected chainId ${network.chainId}, expected ${Chain.ARBITRUM_SEPOLIA}`);
  }

  const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });
  const m = sdk.getManifest();
  const machineId = manifestMachineTokenId(m);
  const contractId = manifestContractId(m);
  const vault = m.arbVault;
  const alice = m.alice;
  const bob = m.bob;
  const charlie = m.charlie;

  let passed = 0;
  let failed = 0;
  const check = (label, pass, detail) => {
    if (ok(label, pass, detail)) passed++;
    else failed++;
  };

  console.log("\n--- Section 1: ONCHAINID + KYC ---");
  for (const [name, wallet] of [
    ["Alice", alice],
    ["Bob", bob],
    ["Charlie", charlie],
  ]) {
    const identity = await sdk.onchainid.getIdentity({ subject: wallet });
    check(
      `${name} identity exists`,
      identity.status === "found",
      identity.status === "found" ? identity.identity : identity.status,
    );
    const { verified } = await sdk.onchainid.isVerified({ wallet });
    check(`${name} isVerified`, verified);
  }

  console.log("\n--- Section 2: Machine + Contract NFT ---");
  try {
    const machineOwner = await sdk.mnft.ownerOf(machineId);
    check("Machine NFT owner", machineOwner.toLowerCase() === alice.toLowerCase() || machineOwner.toLowerCase() === vault.toLowerCase(), machineOwner);
    const { did } = await sdk.mnft.getMachineDid({ tokenId: machineId });
    check("Machine DID non-empty", did.length > 2, `${did.slice(0, 20)}…`);
  } catch (e) {
    check("Machine NFT readable", false, e.message);
  }

  if (contractId) {
    try {
      const { owner } = await sdk.cnft.getContractOwner({ contractId });
      check(
        "Contract NFT owner",
        owner.toLowerCase() === alice.toLowerCase() || owner.toLowerCase() === vault.toLowerCase(),
        owner,
      );
      const expected = sdk.cnft.computeContractId({
        initiator: alice,
        counterparties: [bob, charlie],
        hashDigest: BigInt(m.agreementMetadataHash ?? "0"),
        url: m.agreementUrl ?? "",
      });
      check("contractId matches manifest", expected.contractId === contractId, contractId.toString());
    } catch (e) {
      check("Contract NFT readable", false, e.message);
    }
  } else {
    check("contractId in manifest", false, "missing — run seed:demo-assets");
  }

  console.log("\n--- Section 3: Vault + token + registry ---");
  const token = new Contract(m.token, ["function paused() view returns (bool)"], provider);
  const paused = await token.paused();
  check("Token unpaused", paused === false, `paused=${paused}`);

  console.log("\n--- Sections 4–6: post-mint state (if applicable) ---");
  const minted = await sdk.vault.isMinted();
  check("Vault minted flag", true, minted ? "true (collateral locked)" : "false (ready for depositAndMint)");

  const aliceBal = await sdk.vault.tokenBalance(alice);
  const bobBal = await sdk.vault.tokenBalance(bob);
  const charlieBal = await sdk.vault.tokenBalance(charlie);
  console.log(`  Alice token balance: ${aliceBal}`);
  console.log(`  Bob token balance:   ${bobBal}`);
  console.log(`  Charlie balance:     ${charlieBal}`);

  if (minted) {
    check("Alice received tokens", aliceBal > 0n, aliceBal.toString());
  }

  const fee = await sdk.vault.transactionFee(sdk.vault.parseTokenAmount("10"));
  check("Transfer fee readable", fee.fee > 0n, `fee=${fee.fee} module=${fee.account}`);

  console.log("\n--- Summary ---");
  console.log(`Checks passed: ${passed}, failed: ${failed}`);
  console.log(minted ? "\nBootstrap + optional mint complete." : "\nBootstrap OK. Run Alice depositAndMint (Section 4) via UI or SDK writes.");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
