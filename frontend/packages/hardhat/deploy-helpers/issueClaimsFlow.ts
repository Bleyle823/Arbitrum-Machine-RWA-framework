import type { Signer } from "ethers";
import { network } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import {
  addClaim,
  CT_KYC_APPROVED,
  CT_MNFT_ISSUER,
  CT_MNFT_REGULATOR,
  encodeKycData,
  encodeRoleData,
  identityHasValidClaim,
} from "../scripts/lib/claims.js";

export type IssuedIdentities = {
  aliceIdentity: string;
  bobIdentity: string;
  charlieIdentity: string;
  adminIdentity: string;
};

type ParticipantInput = {
  address: string;
  signer: Signer | null;
  salt: string;
  name: string;
};

/**
 * Create ONCHAINID identities + KYC (666) for Alice/Bob/Charlie and machine roles (7/8) for admin.
 */
export async function issueParticipantClaims(
  idFactoryAddr: string,
  claimIssuerAddr: string,
  admin: Signer,
  alice: Signer,
  bob: Signer,
  charlie: Signer,
): Promise<IssuedIdentities>;
export async function issueParticipantClaims(
  idFactoryAddr: string,
  claimIssuerAddr: string,
  admin: Signer,
  participants: {
    alice: { address: string; signer: Signer | null };
    bob: { address: string; signer: Signer | null };
    charlie: { address: string; signer: Signer | null };
  },
): Promise<IssuedIdentities>;
export async function issueParticipantClaims(
  idFactoryAddr: string,
  claimIssuerAddr: string,
  admin: Signer,
  aliceOrParticipants: Signer | {
    alice: { address: string; signer: Signer | null };
    bob: { address: string; signer: Signer | null };
    charlie: { address: string; signer: Signer | null };
  },
  bob?: Signer,
  charlie?: Signer,
): Promise<IssuedIdentities> {
  const { ethers } = await network.connect();
  const idFactory = new ethers.Contract(idFactoryAddr, OnchainID.contracts.Factory.abi, admin);

  const participants: ParticipantInput[] =
    bob !== undefined && charlie !== undefined
      ? [
          {
            address: await (aliceOrParticipants as Signer).getAddress(),
            signer: aliceOrParticipants as Signer,
            salt: "alice",
            name: "Alice",
          },
          { address: await bob.getAddress(), signer: bob, salt: "bob", name: "Bob" },
          { address: await charlie.getAddress(), signer: charlie, salt: "charlie", name: "Charlie" },
        ]
      : (() => {
          const p = aliceOrParticipants as {
            alice: { address: string; signer: Signer | null };
            bob: { address: string; signer: Signer | null };
            charlie: { address: string; signer: Signer | null };
          };
          return [
            { address: p.alice.address, signer: p.alice.signer, salt: "alice", name: "Alice" },
            { address: p.bob.address, signer: p.bob.signer, salt: "bob", name: "Bob" },
            { address: p.charlie.address, signer: p.charlie.signer, salt: "charlie", name: "Charlie" },
          ];
        })();

  async function ensureIdentity(wallet: string, salt: string): Promise<string> {
    let identity = await idFactory.getIdentity(wallet);
    if (identity !== ethers.ZeroAddress) return identity;

    try {
      await idFactory.createIdentity(wallet, salt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("salt") && !msg.toLowerCase().includes("already")) {
        throw err;
      }
    }
    identity = await idFactory.getIdentity(wallet);
    if (identity === ethers.ZeroAddress) {
      throw new Error(`Could not create or resolve identity for ${wallet}`);
    }
    return identity;
  }

  for (const { address, signer, salt, name } of participants) {
    const identity = await ensureIdentity(address, salt);
    if (await identityHasValidClaim(identity, claimIssuerAddr, CT_KYC_APPROVED)) {
      console.log(`KYC claim already valid → ${name} (${identity})`);
      continue;
    }
    if (!signer) {
      console.warn(
        `Identity ready for ${name} (${address}) — no local signer; they must add KYC claim (topic 666) from their wallet`,
      );
      continue;
    }
    await addClaim(
      signer,
      identity,
      admin,
      claimIssuerAddr,
      CT_KYC_APPROVED,
      await encodeKycData(name, "Test", "1990-01-01", "Berlin"),
    );
    console.log(`KYC claim issued → ${name} (${identity})`);
  }

  const adminIdentity = await ensureIdentity(await admin.getAddress(), "issuer");
  if (!(await identityHasValidClaim(adminIdentity, claimIssuerAddr, CT_MNFT_ISSUER))) {
    await addClaim(admin, adminIdentity, admin, claimIssuerAddr, CT_MNFT_ISSUER, await encodeRoleData("machine issuer"));
    console.log("Machine issuer claim (7) issued for admin");
  } else {
    console.log("Machine issuer claim (7) already valid for admin");
  }
  if (!(await identityHasValidClaim(adminIdentity, claimIssuerAddr, CT_MNFT_REGULATOR))) {
    await addClaim(
      admin,
      adminIdentity,
      admin,
      claimIssuerAddr,
      CT_MNFT_REGULATOR,
      await encodeRoleData("machine regulator"),
    );
    console.log("Machine regulator claim (8) issued for admin");
  } else {
    console.log("Machine regulator claim (8) already valid for admin");
  }

  return {
    aliceIdentity: await idFactory.getIdentity(participants[0].address),
    bobIdentity: await idFactory.getIdentity(participants[1].address),
    charlieIdentity: await idFactory.getIdentity(participants[2].address),
    adminIdentity,
  };
}
