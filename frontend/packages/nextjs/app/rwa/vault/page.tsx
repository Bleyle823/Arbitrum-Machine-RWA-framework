"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { GasRetryHint } from "~~/components/rwa/GasRetryHint";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { useContractLifecycle } from "~~/hooks/rwa/useContractLifecycle";
import { useInvestorVerification } from "~~/hooks/rwa/useInvestorVerification";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { arbVaultExtendedAbi, contractNftExtendedAbi, machineNftExtendedAbi } from "~~/lib/rwa/extendedAbis";

export default function VaultPage() {
  const { addresses, loading } = useRwaAddresses();
  const [mintAmount, setMintAmount] = useState("100");
  const publicClient = usePublicClient();
  const demoLifecycle = useContractLifecycle(addresses.contractId);
  const verification = useInvestorVerification(addresses.identityRegistry, {
    alice: addresses.alice,
    bob: addresses.bob,
    charlie: addresses.charlie,
  });

  const machineWrite = useRwaWriteContract(addresses.machineNft, machineNftExtendedAbi);
  const contractWrite = useRwaWriteContract(addresses.contractNft, contractNftExtendedAbi);
  const vaultWrite = useRwaWriteContract(addresses.arbVault, arbVaultExtendedAbi);

  const vaultState = useQuery({
    queryKey: ["vaultMinted", addresses.arbVault],
    enabled: Boolean(publicClient && addresses.arbVault),
    queryFn: async () =>
      publicClient!.readContract({
        address: addresses.arbVault!,
        abi: arbVaultExtendedAbi,
        functionName: "minted",
      }) as Promise<boolean>,
  });

  if (loading) return <span className="loading loading-spinner" />;

  const vault = addresses.arbVault;
  const machineId = addresses.machineTokenId;
  const contractId = addresses.contractId;
  const aliceVerified = verification.data?.alice;
  const alreadyMinted = vaultState.data === true;
  const canDeposit =
    vault &&
    addresses.machineNft &&
    addresses.contractNft &&
    contractId &&
    contractId !== 0n &&
    aliceVerified &&
    !alreadyMinted;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) — approve NFTs then depositAndMint" />

      {alreadyMinted && (
        <div className="alert alert-success">
          <span>Vault already minted security tokens — continue to Transfers.</span>
        </div>
      )}

      {verification.data && !aliceVerified && (
        <div className="alert alert-error">
          <span>
            Alice is not KYC-verified on this vault. Run <code>yarn issue-claims:arbitrum-sepolia</code>, then refresh.
          </span>
        </div>
      )}

      {demoLifecycle.lifecycle?.statusLabel !== "Completed" && (
        <div className="alert alert-warning">
          <span>Demo contract may not be completed yet — complete signatures before vault deposit.</span>
        </div>
      )}

      {!contractId || contractId === 0n ? (
        <div className="alert alert-error">
          <span>
            No demo contract NFT (<code>contractId: 0</code>). Run <code>yarn seed:demo-assets</code> first.
          </span>
        </div>
      ) : null}

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase A — Approve vault</h2>
          <p className="text-sm font-mono break-all">Vault: {vault ?? "—"}</p>
          <p className="text-sm">machineTokenId: {machineId.toString()}</p>
          {contractId && contractId !== 0n && <ContractIdBadge contractId={contractId} />}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!vault || !machineId || alreadyMinted}
              onClick={() =>
                machineWrite.writeAsync({
                  functionName: "approve",
                  args: [vault!, machineId],
                })
              }
            >
              MachineNft.approve
            </button>
            {contractId && contractId !== 0n && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={!vault || alreadyMinted}
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
          <GasRetryHint />
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Phase B — depositAndMint</h2>
          <p className="text-sm opacity-80">
            Arrays and large <code>contractId</code> are handled here — no manual JSON needed (unlike /debug).
          </p>
          <label className="form-control">
            <span className="label-text">amount (security tokens, 18 decimals)</span>
            <input className="input input-bordered" value={mintAmount} onChange={e => setMintAmount(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canDeposit || vaultWrite.isPending}
            onClick={() =>
              vaultWrite.writeAsync({
                functionName: "depositAndMint",
                args: [
                  [addresses.machineNft!, addresses.contractNft!],
                  [machineId, contractId!],
                  parseEther(mintAmount),
                ],
              })
            }
          >
            depositAndMint
          </button>
          <GasRetryHint />
        </div>
      </div>
    </div>
  );
}
