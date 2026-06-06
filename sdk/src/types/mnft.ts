import type { Signer } from "ethers";

export type GetMachineDid = { tokenId: string | bigint };
export type GetMachineDidResult = { tokenId: bigint; did: string };

export type RegisterMachine = {
  machineIssuer: Signer;
  machineOwner: string;
  machineValue: bigint;
  tokenId: bigint;
  did: Uint8Array;
};

export type RegisterMachineResult = {
  status: "registered";
  tokenId: bigint;
  receipt: unknown;
};
