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
): Promise<IssuedIdentities> {
  const { ethers } = await network.connect();
  const idFactory = new ethers.Contract(idFactoryAddr, OnchainID.contracts.Factory.abi, admin);

  async function ensureIdentity(user: Signer, salt: string): Promise<string> {
    const wallet = await user.getAddress();
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

  for (const [user, salt, name] of [
    [alice, "alice", "Alice"],
    [bob, "bob", "Bob"],
    [charlie, "charlie", "Charlie"],
  ] as const) {
    const identity = await ensureIdentity(user, salt);
    if (await identityHasValidClaim(identity, claimIssuerAddr, CT_KYC_APPROVED)) {
      console.log(`KYC claim already valid → ${name} (${identity})`);
      continue;
    }
    await addClaim(
      user,
      identity,
      admin,
      claimIssuerAddr,
      CT_KYC_APPROVED,
      await encodeKycData(name, "Test", "1990-01-01", "Berlin"),
    );
    console.log(`KYC claim issued → ${name} (${identity})`);
  }

  const adminIdentity = await ensureIdentity(admin, "issuer");
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
    aliceIdentity: await idFactory.getIdentity(await alice.getAddress()),
    bobIdentity: await idFactory.getIdentity(await bob.getAddress()),
    charlieIdentity: await idFactory.getIdentity(await charlie.getAddress()),
    adminIdentity,
  };
}
