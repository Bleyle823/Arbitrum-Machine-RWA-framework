"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { useMyContracts } from "~~/hooks/rwa/useMyContracts";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";
import { useContractLifecycle } from "~~/hooks/rwa/useContractLifecycle";

function ContractRow({ contractId }: { contractId: bigint }) {
  const { lifecycle } = useContractLifecycle(contractId);
  return (
    <tr>
      <td>
        <ContractIdBadge contractId={contractId} />
      </td>
      <td>{lifecycle?.statusLabel ?? "…"}</td>
    </tr>
  );
}

export default function ContractsListPage() {
  const { address } = useAccount();
  const { addresses, loading: addrLoading } = useRwaAddresses();
  const { contractIds, isLoading } = useMyContracts();
  const demoLifecycle = useContractLifecycle(addresses.contractId);

  if (addrLoading) return <span className="loading loading-spinner" />;

  const allIds = new Set<bigint>();
  if (addresses.contractId) allIds.add(addresses.contractId);
  contractIds.forEach(id => allIds.add(id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contract NFTs</h2>
        <Link href="/rwa/contracts/new" className="btn btn-primary btn-sm">
          New agreement
        </Link>
      </div>

      {addresses.contractId && (
        <div className="alert alert-info">
          <div>
            <p>Manifest demo contractId:</p>
            <ContractIdBadge contractId={addresses.contractId} />
            <p className="text-sm mt-1">Status: {demoLifecycle.lifecycle?.statusLabel}</p>
          </div>
        </div>
      )}

      <p className="text-sm">
        Initiator: <code>{address ?? "connect wallet"}</code> — listed via{" "}
        <code>getContractIdsByInitiator</code>
      </p>

      {isLoading ? (
        <span className="loading loading-spinner" />
      ) : (
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>contractId</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...allIds].map(id => (
              <ContractRow key={id.toString()} contractId={id} />
            ))}
            {allIds.size === 0 && (
              <tr>
                <td colSpan={2}>No contracts yet. Create one or run deploy bootstrap.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
