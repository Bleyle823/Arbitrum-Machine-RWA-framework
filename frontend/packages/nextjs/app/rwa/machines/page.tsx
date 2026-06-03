"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Hex, parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import {
  DEMO_NEXT_MACHINE_DID_URI,
  DEMO_MACHINE_VALUE_UNITS,
  DEMO_NEXT_MACHINE_TOKEN_ID,
} from "~~/lib/rwa/demoProductionAssets";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { machineNftExtendedAbi, mockFeeTokenExtendedAbi } from "~~/lib/rwa/extendedAbis";

export default function MachinesPage() {
  const { addresses, loading } = useRwaAddresses();
  const publicClient = usePublicClient();
  const [tokenId, setTokenId] = useState(DEMO_NEXT_MACHINE_TOKEN_ID.toString());
  const [machineValue, setMachineValue] = useState(DEMO_MACHINE_VALUE_UNITS);
  const [didHex, setDidHex] = useState<Hex>(
    `0x${Buffer.from(DEMO_NEXT_MACHINE_DID_URI).toString("hex")}` as Hex,
  );

  const machineWrite = useRwaWriteContract(addresses.machineNft, machineNftExtendedAbi);
  const feeWrite = useRwaWriteContract(addresses.feeToken, mockFeeTokenExtendedAbi);

  const feeQuery = useQuery({
    queryKey: ["machineFee", addresses.machineNft, machineValue],
    enabled: Boolean(publicClient && addresses.machineNft),
    queryFn: async () => {
      const r = (await publicClient!.readContract({
        address: addresses.machineNft!,
        abi: machineNftExtendedAbi,
        functionName: "registrationFeeAndAccount",
        args: [parseEther(machineValue || "0")],
      })) as readonly [bigint, string];
      return r[0];
    },
  });

  const ownerQuery = useQuery({
    queryKey: ["machineOwner", addresses.machineNft, tokenId],
    enabled: Boolean(publicClient && addresses.machineNft && tokenId),
    queryFn: async () => {
      return publicClient!.readContract({
        address: addresses.machineNft!,
        abi: machineNftExtendedAbi,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
    },
    retry: false,
  });

  if (loading) return <span className="loading loading-spinner" />;

  const alice = addresses.alice;
  const fee = feeQuery.data;

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Admin (#0) registers; Alice (#1) approves fee token first" />

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title">Register machine</h2>
          <label className="form-control">
            <span className="label-text">machineOwner (Alice)</span>
            <input className="input input-bordered" value={alice ?? ""} readOnly />
          </label>
          <label className="form-control">
            <span className="label-text">machineValue (ether units)</span>
            <input className="input input-bordered" value={machineValue} onChange={e => setMachineValue(e.target.value)} />
          </label>
          <label className="form-control">
            <span className="label-text">tokenId (unused uint160)</span>
            <input className="input input-bordered" value={tokenId} onChange={e => setTokenId(e.target.value)} />
            {ownerQuery.data && (
              <span className="text-warning text-xs">Taken by {String(ownerQuery.data)}</span>
            )}
          </label>
          <label className="form-control">
            <span className="label-text">did (hex bytes)</span>
            <input
              className="input input-bordered font-mono text-xs"
              value={didHex}
              onChange={e => setDidHex(e.target.value as Hex)}
            />
          </label>
          <p className="text-sm">Registration fee: {fee?.toString() ?? "…"} (MockFeeToken wei)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!addresses.feeToken || !addresses.machineNft || !alice || !fee}
              onClick={() =>
                feeWrite.writeAsync({
                  functionName: "approve",
                  args: [addresses.machineNft!, fee!],
                })
              }
            >
              Alice: approve fee token
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!alice || machineWrite.isPending}
              onClick={() =>
                machineWrite.writeAsync({
                  functionName: "registerMachine",
                  args: [alice!, parseEther(machineValue), BigInt(tokenId), didHex],
                })
              }
            >
              Admin: registerMachine
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm opacity-70">
        Default demo uses machineTokenId {addresses.machineTokenId.toString()} from deploy manifest.
      </p>
    </div>
  );
}
