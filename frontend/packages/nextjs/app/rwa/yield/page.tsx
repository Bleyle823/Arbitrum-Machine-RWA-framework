"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { GasRetryHint } from "~~/components/rwa/GasRetryHint";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { mockFeeTokenExtendedAbi, rewardDistributorExtendedAbi } from "~~/lib/rwa/extendedAbis";

export default function YieldPage() {
  const { addresses, loading } = useRwaAddresses();
  const [yieldAmount, setYieldAmount] = useState("1");
  const [claimTo, setClaimTo] = useState("");

  const feeWrite = useRwaWriteContract(addresses.feeToken, mockFeeTokenExtendedAbi);
  const distWrite = useRwaWriteContract(addresses.rewardDistributor, rewardDistributorExtendedAbi);

  if (loading) return <span className="loading loading-spinner" />;

  const dist = addresses.rewardDistributor;
  const amt = parseEther(yieldAmount || "0");

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) depositYield; Bob (#2) claim / claimTo" />

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Deposit yield (Alice)</h2>
          <input
            className="input input-bordered"
            value={yieldAmount}
            onChange={e => setYieldAmount(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!dist || feeWrite.isPending}
              onClick={() =>
                feeWrite.writeAsync({
                  functionName: "approve",
                  args: [dist!, amt],
                })
              }
            >
              Approve MockFeeToken
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!dist || distWrite.isPending}
              onClick={() =>
                distWrite.writeAsync({
                  functionName: "depositYield",
                  args: [amt],
                })
              }
            >
              depositYield
            </button>
          </div>
          <GasRetryHint />
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Claim (Bob)</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={distWrite.isPending}
            onClick={() => distWrite.writeAsync({ functionName: "claim" })}
          >
            claim
          </button>
          <input
            className="input input-bordered"
            placeholder="claimTo address (optional — Charlie)"
            value={claimTo}
            onChange={e => setClaimTo(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!claimTo || distWrite.isPending}
            onClick={() =>
              distWrite.writeAsync({
                functionName: "claimTo",
                args: [claimTo as `0x${string}`],
              })
            }
          >
            claimTo
          </button>
          <GasRetryHint />
        </div>
      </div>
    </div>
  );
}
