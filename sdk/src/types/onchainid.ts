import type { Signer } from "ethers";

export type GetIdentity = { subject: string };
export type GetIdentityResult =
  | { status: "found"; identity: string }
  | { status: "not_found" };

export type CreateIdentity = {
  idFactoryAdmin: Signer;
  subject: string;
  deploymentSalt: string;
};
export type CreateIdentityResult =
  | { status: "created"; identity: string; receipt: unknown }
  | { status: "exists"; identity: string };

export type IsVerified = { wallet: string };
export type IsVerifiedResult = { verified: boolean; wallet: string };

export type IssueKycClaim = {
  claimIssuer: Signer;
  identityAddress: string;
  first: string;
  last: string;
  dob: string;
  city: string;
};

export type AddClaimToIdentity = {
  identityOwner: Signer;
  identityAddress: string;
  claimIssuer: Signer;
  claimIssuerAddress: string;
  topic: bigint;
  data: string;
};
