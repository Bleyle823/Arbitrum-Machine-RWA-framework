"use client";

import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { contractNftExtendedAbi } from "~~/lib/rwa/extendedAbis";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";

export type ContractLifecycle = {
  exists: boolean;
  completed: boolean;
  cancelled: boolean;
  requiredSignatures: bigint;
  currentSignatures: bigint;
  nftOwner?: Address;
  canSign: boolean;
  signDisabledReason?: string;
  statusLabel: string;
};

export type ContractDetails = {
  initiator: Address;
  counterparties: Address[];
  hashDigest: bigint;
  url: string;
  completed: boolean;
  cancelled: boolean;
  signatureCount: bigint;
};

export function useContractLifecycle(contractId?: bigint) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { addresses } = useRwaAddresses();
  const contractNft = addresses.contractNft;

  const draftQuery = useQuery({
    queryKey: ["draftStatus", contractNft, contractId?.toString()],
    enabled: Boolean(publicClient && contractNft && contractId !== undefined),
    queryFn: async () => {
      const result = (await publicClient!.readContract({
        address: contractNft!,
        abi: contractNftExtendedAbi,
        functionName: "getDraftStatus",
        args: [contractId!],
      })) as readonly [boolean, boolean, boolean, bigint, bigint];
      return result;
    },
  });

  const ownerQuery = useQuery({
    queryKey: ["cnftOwner", contractNft, contractId?.toString()],
    enabled: Boolean(publicClient && contractNft && contractId !== undefined),
    queryFn: async () => {
      try {
        return (await publicClient!.readContract({
          address: contractNft!,
          abi: contractNftExtendedAbi,
          functionName: "ownerOf",
          args: [contractId!],
        })) as Address;
      } catch {
        return undefined;
      }
    },
  });

  const detailsQuery = useQuery({
    queryKey: ["contractDetails", contractNft, contractId?.toString()],
    enabled: Boolean(publicClient && contractNft && contractId !== undefined && draftQuery.data?.[0]),
    queryFn: async () => {
      const r = (await publicClient!.readContract({
        address: contractNft!,
        abi: contractNftExtendedAbi,
        functionName: "getContractDetails",
        args: [contractId!],
      })) as readonly [Address, Address[], bigint, string, boolean, boolean, bigint];
      return {
        initiator: r[0],
        counterparties: r[1],
        hashDigest: r[2],
        url: r[3],
        completed: r[4],
        cancelled: r[5],
        signatureCount: r[6],
      } satisfies ContractDetails;
    },
  });

  const lifecycle: ContractLifecycle | null = (() => {
    const nftOwner = ownerQuery.data;
    if (nftOwner && !draftQuery.data?.[0]) {
      return {
        exists: true,
        completed: true,
        cancelled: false,
        requiredSignatures: 0n,
        currentSignatures: 0n,
        nftOwner,
        canSign: false,
        signDisabledReason: "Contract completed — NFT minted to initiator",
        statusLabel: "Completed",
      };
    }

    if (!draftQuery.data) return null;
    const [exists, completed, cancelled, required, current] = draftQuery.data;

    if (!exists) {
      return {
        exists: false,
        completed: false,
        cancelled: false,
        requiredSignatures: 0n,
        currentSignatures: 0n,
        canSign: false,
        signDisabledReason: "Unknown contract ID",
        statusLabel: "Not found",
      };
    }

    if (cancelled) {
      return {
        exists,
        completed,
        cancelled,
        requiredSignatures: required,
        currentSignatures: current,
        canSign: false,
        signDisabledReason: "Contract cancelled",
        statusLabel: "Cancelled",
      };
    }

    if (completed || nftOwner) {
      return {
        exists,
        completed: true,
        cancelled,
        requiredSignatures: required,
        currentSignatures: current,
        nftOwner,
        canSign: false,
        signDisabledReason: "All signatures collected — signing closed (Inactive)",
        statusLabel: "Completed",
      };
    }

    if (!address) {
      return {
        exists,
        completed,
        cancelled,
        requiredSignatures: required,
        currentSignatures: current,
        canSign: false,
        signDisabledReason: "Connect wallet",
        statusLabel: `Awaiting signatures (${current}/${required})`,
      };
    }

    return {
      exists,
      completed,
      cancelled,
      requiredSignatures: required,
      currentSignatures: current,
      canSign: true,
      statusLabel: `Awaiting signatures (${current}/${required})`,
    };
  })();

  return {
    lifecycle,
    details: detailsQuery.data,
    isLoading: draftQuery.isLoading,
    refetch: () => {
      draftQuery.refetch();
      ownerQuery.refetch();
      detailsQuery.refetch();
    },
  };
}
