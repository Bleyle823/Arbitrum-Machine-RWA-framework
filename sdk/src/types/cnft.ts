import type { Signer } from "ethers";

export type CreateContract = {
  initiator: Signer;
  counterparties: string[];
  hashDigest: bigint;
  url: string;
};

export type CreateContractResult = {
  status: "created";
  contractId: bigint;
  receipt: unknown;
};

export type SignContract = {
  signer: Signer;
  contractId: bigint;
};

export type SignContractResult = {
  status: "signed";
  contractId: bigint;
  receipt: unknown;
};

export type GetContractOwner = { contractId: bigint };
export type GetContractOwnerResult = { contractId: bigint; owner: string };

export type ComputeContractId = {
  initiator: string;
  counterparties: string[];
  hashDigest: bigint;
  url: string;
};

export type ComputeContractIdResult = { contractId: bigint };
