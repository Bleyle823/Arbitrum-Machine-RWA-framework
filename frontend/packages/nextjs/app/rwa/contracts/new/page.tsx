"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { type Address, keccak256 } from "viem";
import { PinataUploadField } from "~~/components/rwa/PinataUploadField";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import {
  DEMO_AGREEMENT_IPFS_URL,
  DEMO_AGREEMENT_METADATA,
  DEMO_DEAL_REFERENCE,
  DEMO_NEXT_DEAL_REFERENCE,
} from "~~/lib/rwa/demoProductionAssets";
import { computeContractId, hashDigestFromUtf8 } from "~~/lib/rwa/contractId";
import { contractNftExtendedAbi, mockFeeTokenExtendedAbi } from "~~/lib/rwa/extendedAbis";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";

export default function NewContractPage() {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { addresses, loading } = useRwaAddresses();
  const [hashDigest, setHashDigest] = useState<bigint | null>(null);
  const [url, setUrl] = useState(DEMO_AGREEMENT_IPFS_URL);
  const [useLabel, setUseLabel] = useState(false);
  const [label, setLabel] = useState(DEMO_NEXT_DEAL_REFERENCE);

  const bob = addresses.bob;
  const charlie = addresses.charlie;

  const contractWrite = useRwaWriteContract(addresses.contractNft, contractNftExtendedAbi);
  const feeWrite = useRwaWriteContract(addresses.feeToken, mockFeeTokenExtendedAbi);

  const feeQuery = useQuery({
    queryKey: ["cnftSetupFee", addresses.contractNft],
    enabled: Boolean(publicClient && addresses.contractNft),
    queryFn: async () => {
      const r = (await publicClient!.readContract({
        address: addresses.contractNft!,
        abi: contractNftExtendedAbi,
        functionName: "setupFeeAndAccount",
      })) as readonly [bigint, string];
      return r[0];
    },
  });

  const digest = useLabel ? hashDigestFromUtf8(label) : hashDigest;
  const previewId =
    address && bob && charlie && digest !== null
      ? computeContractId(address, [bob, charlie], digest, url)
      : undefined;

  const onchainPreview = useQuery({
    queryKey: ["computeContractId", address, bob, charlie, digest?.toString(), url],
    enabled: Boolean(publicClient && addresses.contractNft && address && bob && charlie && digest !== null),
    queryFn: async () => {
      return publicClient!.readContract({
        address: addresses.contractNft!,
        abi: contractNftExtendedAbi,
        functionName: "computeContractId",
        args: [address!, [bob!, charlie!], digest!, url],
      }) as bigint;
    },
  });

  if (loading) return <span className="loading loading-spinner" />;

  const fee = feeQuery.data;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) — initiator" />

      <PinataUploadField
        initiator={address}
        onUploaded={r => {
          setHashDigest(r.hashDigest);
          setUrl(r.ipfsUrl);
          setUseLabel(false);
        }}
      />

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <label className="label cursor-pointer gap-2">
            <input type="checkbox" className="checkbox" checked={useLabel} onChange={e => setUseLabel(e.target.checked)} />
            <span>Use deal reference string hash instead of uploaded file hash</span>
          </label>
          {useLabel && (
            <input className="input input-bordered" value={label} onChange={e => setLabel(e.target.value)} placeholder="CYBER-AUTO-DELIVERY-2026-0043" />
          )}
          {!useLabel && !hashDigest && (
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => {
                const canonical = JSON.stringify({
                  ...DEMO_AGREEMENT_METADATA,
                  dealRef: DEMO_DEAL_REFERENCE,
                });
                setHashDigest(BigInt(keccak256(new TextEncoder().encode(canonical))));
              }}
            >
              Use bootstrap-style metadata hash
            </button>
          )}
          <label className="form-control">
            <span className="label-text">url (on-chain string)</span>
            <input className="input input-bordered" value={url} onChange={e => setUrl(e.target.value)} />
          </label>
          <p className="text-sm">Counterparties: Bob, Charlie (from manifest)</p>
          {previewId && (
            <div>
              <p className="text-sm font-semibold">Preview contractId:</p>
              <ContractIdBadge contractId={previewId} />
              {onchainPreview.data !== undefined && onchainPreview.data !== previewId && (
                <p className="text-error text-xs">Redeploy contracts for on-chain computeContractId view</p>
              )}
            </div>
          )}
          <p className="text-sm">Setup fee: {fee?.toString() ?? "…"}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!addresses.contractNft || !fee}
              onClick={() =>
                feeWrite.writeAsync({
                  functionName: "approve",
                  args: [addresses.contractNft!, fee!],
                })
              }
            >
              Approve fee token
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!address || !bob || !charlie || digest === null || contractWrite.isPending}
              onClick={async () => {
                await contractWrite.writeAsync({
                  functionName: "initContractAndSign",
                  args: [[bob, charlie] as Address[], digest!, url],
                });
                if (previewId) router.push(`/rwa/contracts/${previewId.toString()}`);
              }}
            >
              initContractAndSign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
