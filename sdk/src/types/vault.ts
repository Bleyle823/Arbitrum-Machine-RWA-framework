import type { Signer } from "ethers";

export type NftApproval = {
  owner: Signer;
  nft: string;
  vault: string;
  tokenIds: (string | bigint)[];
};

export type NftApprovalResult = {
  status: "approved";
  nft: string;
  vault: string;
  tokenIds: bigint[];
  receipts: unknown[];
};

export type DepositAndMint = {
  vaultController: Signer;
  vault?: string;
  rwaNfts?: string[];
  tokenIds: (string | bigint)[];
  amount: bigint;
};

export type DepositAndMintResult = {
  status: "deposited_and_minted";
  vault: string;
  tokenIds: bigint[];
  amount: bigint;
  receipt: unknown;
};

export type Transfer = {
  from: Signer;
  token?: string;
  to: string;
  amount: bigint;
};

export type TransferResult = {
  status: "transferred";
  to: string;
  amount: bigint;
  receipt: unknown;
};

export type EnsureTransferFeeAllowance = {
  allowanceSigner: Signer;
  transferAmount: bigint;
  /** Allowance for two transfers at ~1% (default 0.2e18). */
  allowance?: bigint;
};

export type DepositYield = {
  depositor: Signer;
  amount: bigint;
  vault?: string;
};

export type ClaimYield = { claimant: Signer; vault?: string };
export type ClaimYieldTo = { claimant: Signer; to: string; vault?: string };
