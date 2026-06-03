"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { WalletRoleHint, ConnectedWalletBadge } from "~~/components/rwa/WalletRoleHint";
import { useContractLifecycle } from "~~/hooks/rwa/useContractLifecycle";
import { useRwaWriteContract } from "~~/hooks/rwa/useRwaContract";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { contractNftExtendedAbi } from "~~/lib/rwa/extendedAbis";
import { gatewayUrlForCid } from "~~/lib/rwa/contractId";

export default function ContractDetailPage() {
  const params = useParams();
  const idStr = params.id as string;
  const contractId = BigInt(idStr);
  const { address } = useAccount();
  const { addresses } = useRwaAddresses();
  const { lifecycle, details, isLoading, refetch } = useContractLifecycle(contractId);
  const contractWrite = useRwaWriteContract(addresses.contractNft, contractNftExtendedAbi);

  const gatewayHost = process.env.NEXT_PUBLIC_GATEWAY_URL;
  const url = details?.url;
  const gatewayLink =
    url?.startsWith("ipfs://") && gatewayHost
      ? gatewayUrlForCid(url, gatewayHost)
      : url?.startsWith("http")
        ? url
        : null;

  if (isLoading) return <span className="loading loading-spinner" />;

  return (
    <div className="space-y-6">
      <ContractIdBadge contractId={contractId} />
      <p>
        Status: <strong>{lifecycle?.statusLabel}</strong>
      </p>
      {lifecycle?.signDisabledReason && (
        <div className="alert alert-warning">
          <span>{lifecycle.signDisabledReason}</span>
        </div>
      )}

      {details && (
        <div className="card bg-base-200 text-sm">
          <div className="card-body space-y-1 font-mono break-all">
            <p>Initiator: {details.initiator}</p>
            <p>URL: {details.url}</p>
            {gatewayLink && (
              <a href={gatewayLink} className="link" target="_blank" rel="noreferrer">
                View on Pinata gateway
              </a>
            )}
            <p>Signatures: {details.signatureCount.toString()}</p>
          </div>
        </div>
      )}

      <WalletRoleHint expected="Bob (#2) or Charlie (#3) to sign — or skip if Completed" />
      <p>
        Connected: <ConnectedWalletBadge address={address} />
      </p>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!lifecycle?.canSign || contractWrite.isPending}
        onClick={async () => {
          await contractWrite.writeAsync({
            functionName: "signContract",
            args: [contractId],
          });
          refetch();
        }}
      >
        {contractWrite.isPending ? "Signing…" : "signContract"}
      </button>
    </div>
  );
}
