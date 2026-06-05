"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther, parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { GasRetryHint } from "~~/components/rwa/GasRetryHint";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { arbVaultExtendedAbi, mockFeeTokenExtendedAbi, tokenExtendedAbi } from "~~/lib/rwa/extendedAbis";

const TRANSFER_AMOUNT = parseEther("10");
/** Covers two 10-token transfers at ~1% fee each (demo guide Section 5). */
const FEE_ALLOWANCE = parseEther("0.2");

export default function InvestPage() {
  const { addresses, loading } = useRwaAddresses();
  const publicClient = usePublicClient();

  const feeQuery = useQuery({
    queryKey: ["txFee", addresses.arbVault, "10"],
    enabled: Boolean(publicClient && addresses.arbVault),
    queryFn: async () => {
      const r = (await publicClient!.readContract({
        address: addresses.arbVault!,
        abi: arbVaultExtendedAbi,
        functionName: "transactionFeeAndAccount",
        args: [TRANSFER_AMOUNT],
      })) as readonly [bigint, string];
      return r[0];
    },
  });

  const balanceQuery = useQuery({
    queryKey: ["aliceTokenBalance", addresses.token, addresses.alice],
    enabled: Boolean(publicClient && addresses.token && addresses.alice),
    queryFn: async () =>
      publicClient!.readContract({
        address: addresses.token!,
        abi: tokenExtendedAbi,
        functionName: "balanceOf",
        args: [addresses.alice!],
      }) as Promise<bigint>,
  });

  const feeWrite = useRwaWriteContract(addresses.feeToken, mockFeeTokenExtendedAbi);
  const tokenWrite = useRwaWriteContract(addresses.token, tokenExtendedAbi);

  if (loading) return <span className="loading loading-spinner" />;

  const fee = feeQuery.data;
  const aliceBalance = balanceQuery.data;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) — approve fee module then transfer Token" />

      {(aliceBalance ?? 0n) === 0n && (
        <div className="alert alert-warning">
          <span>Alice has no security tokens yet — complete Vault deposit & mint first.</span>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase A — Approve transfer fees</h2>
          <p className="text-sm">
            Fee per 10 tokens: {fee?.toString() ?? "…"} MockFeeToken wei (~1%). Approving{" "}
            <code>{formatEther(FEE_ALLOWANCE)}</code> covers Bob + Charlie transfers.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!addresses.feeModule || feeWrite.isPending}
            onClick={() =>
              feeWrite.writeAsync({
                functionName: "approve",
                args: [addresses.feeModule!, FEE_ALLOWANCE],
              })
            }
          >
            MockFeeToken.approve (fee module)
          </button>
          <GasRetryHint />
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase B — Transfer 10 tokens each</h2>
          <p className="text-sm">
            Alice balance: {aliceBalance !== undefined ? `${formatEther(aliceBalance)} tokens` : "…"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!addresses.bob || tokenWrite.isPending}
              onClick={() =>
                tokenWrite.writeAsync({
                  functionName: "transfer",
                  args: [addresses.bob!, TRANSFER_AMOUNT],
                })
              }
            >
              Transfer 10 → Bob
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!addresses.charlie || tokenWrite.isPending}
              onClick={() =>
                tokenWrite.writeAsync({
                  functionName: "transfer",
                  args: [addresses.charlie!, TRANSFER_AMOUNT],
                })
              }
            >
              Transfer 10 → Charlie
            </button>
          </div>
          <GasRetryHint />
        </div>
      </div>
    </div>
  );
}
