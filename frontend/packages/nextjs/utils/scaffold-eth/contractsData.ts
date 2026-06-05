import { useMemo } from "react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useRwaManifest } from "~~/hooks/rwa/useRwaManifest";
import { manifestContractsForChain } from "~~/lib/rwa/manifestContracts";
import { ContractName, GenericContractsDeclaration, contracts } from "~~/utils/scaffold-eth/contract";

const DEFAULT_ALL_CONTRACTS: GenericContractsDeclaration[number] = {};

export function useAllContracts() {
  const { targetNetwork } = useTargetNetwork();
  const { manifest } = useRwaManifest();

  return useMemo(() => {
    const base = contracts?.[targetNetwork.id] ?? DEFAULT_ALL_CONTRACTS;
    const fromManifest = manifestContractsForChain(targetNetwork.id, manifest);
    if (Object.keys(fromManifest).length === 0) return base;
    return { ...base, ...fromManifest };
  }, [targetNetwork.id, manifest]);
}
