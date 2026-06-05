"use client";

import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePublicClient } from "wagmi";
import { identityRegistryExtendedAbi } from "~~/lib/rwa/extendedAbis";

export type InvestorKey = "alice" | "bob" | "charlie";

export function useInvestorVerification(
  identityRegistry?: Address,
  investors?: Partial<Record<InvestorKey, Address>>,
) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: [
      "investorVerification",
      identityRegistry,
      investors?.alice,
      investors?.bob,
      investors?.charlie,
    ],
    enabled: Boolean(publicClient && identityRegistry && investors),
    queryFn: async () => {
      const entries = (["alice", "bob", "charlie"] as const).map(async key => {
        const wallet = investors![key];
        if (!wallet) return [key, false] as const;
        const verified = (await publicClient!.readContract({
          address: identityRegistry!,
          abi: identityRegistryExtendedAbi,
          functionName: "isVerified",
          args: [wallet],
        })) as boolean;
        return [key, verified] as const;
      });
      const results = await Promise.all(entries);
      return Object.fromEntries(results) as Record<InvestorKey, boolean>;
    },
  });
}
