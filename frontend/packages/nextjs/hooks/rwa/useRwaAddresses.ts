"use client";

import { useMemo } from "react";
import { type Address } from "viem";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useRwaManifest } from "~~/hooks/rwa/useRwaManifest";

function addrOrDeploy(manifestVal: string | undefined, deployed?: Address): Address | undefined {
  if (manifestVal && manifestVal.startsWith("0x")) return manifestVal as Address;
  return deployed;
}

export function useRwaAddresses() {
  const { manifest, loading: manifestLoading } = useRwaManifest();

  const machineNft = useDeployedContractInfo({ contractName: "MachineNft" });
  const contractNft = useDeployedContractInfo({ contractName: "ContractNft" });
  const arbVault = useDeployedContractInfo({ contractName: "ArbVault" });
  const token = useDeployedContractInfo({ contractName: "Token" });
  const feeToken = useDeployedContractInfo({ contractName: "MockFeeToken" });
  const feeModule = useDeployedContractInfo({ contractName: "NativeTransferFeeModule" });
  const rewardDistributor = useDeployedContractInfo({ contractName: "RewardDistributor" });
  const arbRwaNft = useDeployedContractInfo({ contractName: "ArbRwaNft" });

  const addresses = useMemo(
    () => ({
      machineNft: addrOrDeploy(manifest?.machineNft, machineNft.data?.address),
      contractNft: addrOrDeploy(manifest?.contractNft, contractNft.data?.address),
      arbVault: addrOrDeploy(manifest?.arbVault, arbVault.data?.address),
      token: addrOrDeploy(manifest?.token, token.data?.address),
      feeToken: addrOrDeploy(manifest?.feeToken, feeToken.data?.address),
      feeModule: addrOrDeploy(manifest?.feeModule, feeModule.data?.address),
      rewardDistributor: addrOrDeploy(manifest?.rewardDistributor, rewardDistributor.data?.address),
      arbRwaNft: addrOrDeploy(manifest?.arbRwaNft, arbRwaNft.data?.address),
      machineTokenId: manifest?.machineTokenId ? BigInt(manifest.machineTokenId) : 202604042n,
      contractId: manifest?.contractId ? BigInt(manifest.contractId) : undefined,
      agreementUrl: manifest?.agreementUrl,
      dealReference: manifest?.dealReference ?? manifest?.hashLabel,
      assetSerial: manifest?.assetSerial,
      machineDidUri: manifest?.machineDidUri,
      machineValueWei: manifest?.machineValueWei,
      alice: manifest?.alice as Address | undefined,
      bob: manifest?.bob as Address | undefined,
      charlie: manifest?.charlie as Address | undefined,
      admin: manifest?.admin as Address | undefined,
    }),
    [manifest, machineNft.data, contractNft.data, arbVault.data, token.data, feeToken.data, feeModule.data, rewardDistributor.data, arbRwaNft.data],
  );

  const loading =
    manifestLoading ||
    machineNft.isLoading ||
    contractNft.isLoading ||
    arbVault.isLoading ||
    token.isLoading;

  return { addresses, manifest, loading };
}
