"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePublicClient } from "wagmi";
import { useInvestorVerification } from "~~/hooks/rwa/useInvestorVerification";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { arbVaultExtendedAbi, machineNftExtendedAbi, tokenExtendedAbi } from "~~/lib/rwa/extendedAbis";

type Step = {
  href: string;
  label: string;
  ready: boolean;
  hint?: string;
};

export function DemoWorkflowSteps() {
  const { addresses } = useRwaAddresses();
  const publicClient = usePublicClient();
  const verification = useInvestorVerification(addresses.identityRegistry, {
    alice: addresses.alice,
    bob: addresses.bob,
    charlie: addresses.charlie,
  });

  const onChain = useQuery({
    queryKey: ["demoWorkflow", addresses.arbVault, addresses.machineNft, addresses.token, addresses.alice],
    enabled: Boolean(publicClient && addresses.arbVault && addresses.machineNft && addresses.alice),
    queryFn: async () => {
      const [minted, machineOwner, aliceBalance] = await Promise.all([
        publicClient!.readContract({
          address: addresses.arbVault!,
          abi: arbVaultExtendedAbi,
          functionName: "minted",
        }) as Promise<boolean>,
        publicClient!.readContract({
          address: addresses.machineNft!,
          abi: machineNftExtendedAbi,
          functionName: "ownerOf",
          args: [addresses.machineTokenId],
        }) as Promise<Address>,
        addresses.token
          ? (publicClient!.readContract({
              address: addresses.token,
              abi: tokenExtendedAbi,
              functionName: "balanceOf",
              args: [addresses.alice!],
            }) as Promise<bigint>)
          : 0n,
      ]);
      return { minted, machineOwner, aliceBalance };
    },
  });

  const hasContractId = Boolean(addresses.contractId && addresses.contractId !== 0n);
  const machineWithAlice =
    onChain.data?.machineOwner?.toLowerCase() === addresses.alice?.toLowerCase();
  const nftsInVault =
    onChain.data?.minted ||
    (onChain.data?.machineOwner?.toLowerCase() === addresses.arbVault?.toLowerCase());
  const aliceHasTokens = (onChain.data?.aliceBalance ?? 0n) > 0n;
  const kycReady = verification.data?.alice && verification.data?.bob && verification.data?.charlie;

  const steps: Step[] = [
    {
      href: "/rwa/machines",
      label: "1. Machine NFT (verify or register)",
      ready: machineWithAlice || nftsInVault,
      hint: hasContractId ? undefined : "Run yarn seed:demo-assets if contractId is 0",
    },
    {
      href: "/rwa/contracts",
      label: "2. Contract NFT (verify completed deal)",
      ready: hasContractId,
    },
    {
      href: "/rwa/vault",
      label: "3. Vault deposit & mint (Alice)",
      ready: nftsInVault && aliceHasTokens,
      hint: !kycReady ? "Issue KYC claims first (see dashboard)" : undefined,
    },
    {
      href: "/rwa/invest",
      label: "4. Transfer to Bob & Charlie (Alice)",
      ready: aliceHasTokens,
    },
    {
      href: "/rwa/yield",
      label: "5. Yield deposit & claim",
      ready: false,
    },
  ];

  return (
    <div className="card bg-base-200">
      <div className="card-body space-y-3">
        <h2 className="card-title text-base">Demo workflow</h2>
        {onChain.isLoading && <span className="loading loading-spinner loading-sm" />}
        <ol className="space-y-2">
          {steps.map(step => (
            <li key={step.href} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Link href={step.href} className="link link-hover text-sm">
                {step.label}
              </Link>
              <span className={`badge badge-sm ${step.ready ? "badge-success" : "badge-ghost"}`}>
                {step.ready ? "done" : "todo"}
              </span>
              {step.hint && !step.ready && <span className="text-xs opacity-70 sm:basis-full">{step.hint}</span>}
            </li>
          ))}
        </ol>
        {onChain.data?.minted && (
          <p className="text-sm text-success">Vault has minted security tokens to Alice.</p>
        )}
      </div>
    </div>
  );
}
