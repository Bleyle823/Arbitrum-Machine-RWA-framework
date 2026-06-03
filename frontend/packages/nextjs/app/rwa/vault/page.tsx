"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useContractLifecycle } from "~~/hooks/rwa/useContractLifecycle";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { arbVaultExtendedAbi, contractNftExtendedAbi, machineNftExtendedAbi } from "~~/lib/rwa/extendedAbis";

export default function VaultPage() {
  const { addresses, loading } = useRwaAddresses();
  const [mintAmount, setMintAmount] = useState("100");
  const demoLifecycle = useContractLifecycle(addresses.contractId);

  const machineWrite = useRwaWriteContract(addresses.machineNft, machineNftExtendedAbi);
  const contractWrite = useRwaWriteContract(addresses.contractNft, contractNftExtendedAbi);
  const vaultWrite = useRwaWriteContract(addresses.arbVault, arbVaultExtendedAbi);

  if (loading) return <span className="loading loading-spinner" />;

  const vault = addresses.arbVault;
  const machineId = addresses.machineTokenId;
  const contractId = addresses.contractId;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) — approve NFTs then depositAndMint" />

      {demoLifecycle.lifecycle?.statusLabel !== "Completed" && (
        <div className="alert alert-warning">
          <span>Demo contract may not be completed yet — complete signatures before vault deposit.</span>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase A — Approve vault</h2>
          <p className="text-sm font-mono break-all">Vault: {vault ?? "—"}</p>
          <p className="text-sm">machineTokenId: {machineId.toString()}</p>
          {contractId && <ContractIdBadge contractId={contractId} />}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!vault || !machineId}
              onClick={() =>
                machineWrite.writeAsync({
                  functionName: "approve",
                  args: [vault!, machineId],
                })
              }
            >
              MachineNft.approve
            </button>
            {contractId && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={!vault}
                onClick={() =>
                  contractWrite.writeAsync({
                    functionName: "approve",
                    args: [vault!, contractId],
                  })
                }
              >
                ContractNft.approve
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase B — depositAndMint</h2>
          <label className="form-control">
            <span className="label-text">amount (security tokens, 18 decimals)</span>
            <input className="input input-bordered" value={mintAmount} onChange={e => setMintAmount(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!vault || !addresses.machineNft || !addresses.contractNft || !contractId || vaultWrite.isPending}
            onClick={() =>
              vaultWrite.writeAsync({
                functionName: "depositAndMint",
                args: [
                  [addresses.machineNft!, addresses.contractNft!],
                  [machineId, contractId],
                  parseEther(mintAmount),
                ],
              })
            }
          >
            depositAndMint
          </button>
        </div>
      </div>
    </div>
  );
}
