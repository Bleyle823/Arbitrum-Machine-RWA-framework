"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { arbVaultExtendedAbi, mockFeeTokenExtendedAbi, tokenExtendedAbi } from "~~/lib/rwa/extendedAbis";

export default function InvestPage() {
  const { addresses, loading } = useRwaAddresses();
  const publicClient = usePublicClient();
  const [amount, setAmount] = useState("10");
  const [recipient, setRecipient] = useState<"bob" | "charlie">("bob");

  const feeQuery = useQuery({
    queryKey: ["txFee", addresses.arbVault, amount],
    enabled: Boolean(publicClient && addresses.arbVault),
    queryFn: async () => {
      const r = (await publicClient!.readContract({
        address: addresses.arbVault!,
        abi: arbVaultExtendedAbi,
        functionName: "transactionFeeAndAccount",
        args: [parseEther(amount || "0")],
      })) as readonly [bigint, string];
      return r[0];
    },
  });

  const feeWrite = useRwaWriteContract(addresses.feeToken, mockFeeTokenExtendedAbi);
  const tokenWrite = useRwaWriteContract(addresses.token, tokenExtendedAbi);

  if (loading) return <span className="loading loading-spinner" />;

  const fee = feeQuery.data;
  const to = recipient === "bob" ? addresses.bob : addresses.charlie;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) — approve fee module then transfer Token" />

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Compliant transfer</h2>
          <label className="form-control">
            <span className="label-text">amount (tokens)</span>
            <input className="input input-bordered" value={amount} onChange={e => setAmount(e.target.value)} />
          </label>
          <p className="text-sm">Transfer fee: {fee?.toString() ?? "…"}</p>
          <select
            className="select select-bordered"
            value={recipient}
            onChange={e => setRecipient(e.target.value as "bob" | "charlie")}
          >
            <option value="bob">Bob</option>
            <option value="charlie">Charlie</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!addresses.feeModule || !fee}
              onClick={() =>
                feeWrite.writeAsync({
                  functionName: "approve",
                  args: [addresses.feeModule!, fee!],
                })
              }
            >
              Approve fee token
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!to || tokenWrite.isPending}
              onClick={() =>
                tokenWrite.writeAsync({
                  functionName: "transfer",
                  args: [to!, parseEther(amount)],
                })
              }
            >
              Token.transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
