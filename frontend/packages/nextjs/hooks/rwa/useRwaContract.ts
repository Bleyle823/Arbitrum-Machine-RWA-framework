"use client";

import { useCallback } from "react";
import { type Abi, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-eth";

export function useRwaWriteContract(address?: Address, abi?: Abi) {
  const { chain } = useAccount();
  const writeContract = useWriteContract();
  const writeTx = useTransactor();

  const writeAsync = useCallback(
    async (params: { functionName: string; args?: readonly unknown[]; value?: bigint }) => {
      if (!address || !abi || !chain) throw new Error("Contract not ready");
      return writeTx(async () => {
        const hash = await writeContract.writeContractAsync({
          address,
          abi,
          functionName: params.functionName,
          args: params.args,
          value: params.value ?? 0n,
          chainId: chain.id,
        });
        return hash;
      });
    },
    [address, abi, chain, writeContract, writeTx],
  );

  return { writeAsync, isPending: writeContract.isPending };
}

export function useRwaReadContract<T = unknown>(
  address?: Address,
  abi?: Abi,
  functionName?: string,
  args?: readonly unknown[],
  enabled = true,
) {
  const publicClient = usePublicClient();
  const read = useCallback(async (): Promise<T | undefined> => {
    if (!publicClient || !address || !abi || !functionName || !enabled) return undefined;
    return publicClient.readContract({
      address,
      abi,
      functionName,
      args,
    }) as Promise<T>;
  }, [publicClient, address, abi, functionName, args, enabled]);

  return read;
}

export type { Hex };
