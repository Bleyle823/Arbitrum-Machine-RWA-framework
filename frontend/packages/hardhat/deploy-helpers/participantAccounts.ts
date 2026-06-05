import type { Signer } from "ethers";
import { network } from "hardhat";
import { signerForParticipantAddress } from "./participantPrivateKeys.js";

/** Default Hardhat burner wallets (local dev). */
export const LOCAL_PARTICIPANT_ADDRESSES = {
  admin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  alice: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  bob: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  charlie: "0x90F79bf6EB2c4f870365E7859821662C42b0b0e6",
} as const;

/** Arbitrum Sepolia test wallets (override via ALICE_ADDRESS / BOB_ADDRESS / CHARLIE_ADDRESS). */
export const TESTNET_PARTICIPANT_ADDRESSES = {
  alice: process.env.ALICE_ADDRESS ?? "0xdEBC58A3CE140Ef84E5757013c1998FdAfDB44D6",
  bob: process.env.BOB_ADDRESS ?? "0xc67c0d1d4e12D838f3ed2fC6241D8e65Dfb3100B",
  charlie: process.env.CHARLIE_ADDRESS ?? "0xe62803A1A219Be5f0D437ed9F84F2e4CDc8A3Ca1",
} as const;

export type ParticipantAddresses = {
  admin: string;
  alice: string;
  bob: string;
  charlie: string;
};

export async function resolveParticipantAddresses(adminSigner: Signer): Promise<ParticipantAddresses> {
  const { ethers } = await network.connect();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const isLocalChain = chainId === 31337 || chainId === 1337;
  const admin = await adminSigner.getAddress();

  if (isLocalChain) {
    const signers = await ethers.getSigners();
    return {
      admin,
      alice: await (signers[1] ?? adminSigner).getAddress(),
      bob: await (signers[2] ?? adminSigner).getAddress(),
      charlie: await (signers[3] ?? adminSigner).getAddress(),
    };
  }

  return {
    admin,
    alice: TESTNET_PARTICIPANT_ADDRESSES.alice,
    bob: TESTNET_PARTICIPANT_ADDRESSES.bob,
    charlie: TESTNET_PARTICIPANT_ADDRESSES.charlie,
  };
}

export async function resolveParticipantSigners(adminSigner: Signer): Promise<{
  admin: Signer;
  alice: Signer | null;
  bob: Signer | null;
  charlie: Signer | null;
  addresses: ParticipantAddresses;
}> {
  const { ethers } = await network.connect();
  const addresses = await resolveParticipantAddresses(adminSigner);
  const signers = await ethers.getSigners();
  const provider = ethers.provider;

  return {
    admin: adminSigner,
    alice: await signerForParticipantAddress(provider, signers, addresses.alice),
    bob: await signerForParticipantAddress(provider, signers, addresses.bob),
    charlie: await signerForParticipantAddress(provider, signers, addresses.charlie),
    addresses,
  };
}
