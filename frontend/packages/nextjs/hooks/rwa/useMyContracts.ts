"use client";

import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { contractNftExtendedAbi } from "~~/lib/rwa/extendedAbis";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";

export function useMyContracts(asInitiator?: Address) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { addresses } = useRwaAddresses();
  const initiator = asInitiator ?? address;
  const contractNft = addresses.contractNft;

  const query = useQuery({
    queryKey: ["contractIdsByInitiator", contractNft, initiator],
    enabled: Boolean(publicClient && contractNft && initiator),
    queryFn: async () => {
      const ids = (await publicClient!.readContract({
        address: contractNft!,
        abi: contractNftExtendedAbi,
        functionName: "getContractIdsByInitiator",
        args: [initiator!],
      })) as bigint[];
      return [...ids];
    },
  });

  return { contractIds: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}
