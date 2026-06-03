"use client";

import Link from "next/link";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { WalletRoleHint } from "~~/components/rwa/WalletRoleHint";
import { useContractLifecycle } from "~~/hooks/rwa/useContractLifecycle";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";

export default function RwaDashboardPage() {
  const { addresses, manifest, loading } = useRwaAddresses();
  const demoId = addresses.contractId;
  const { lifecycle } = useContractLifecycle(demoId);

  if (loading) {
    return <span className="loading loading-spinner" />;
  }

  return (
    <div className="space-y-6">
      <WalletRoleHint expected="Alice (#1) for vault & contracts; Admin (#0) for machines" />

      {!manifest && (
        <div className="alert alert-warning">
          <span>
            No <code>rwa-manifest.json</code> found. Run <code>yarn deploy --tags RwaFramework</code> in hardhat, then
            refresh.
          </span>
        </div>
      )}

      {lifecycle?.statusLabel === "Completed" && demoId && (
        <div className="alert alert-success">
          <span>Demo contract is already completed — skip signContract and go to Vault.</span>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Deployed addresses</h2>
          <ul className="text-sm space-y-1 font-mono break-all">
            <li>MachineNft: {addresses.machineNft ?? "—"}</li>
            <li>ContractNft: {addresses.contractNft ?? "—"}</li>
            <li>ArbVault: {addresses.arbVault ?? "—"}</li>
            <li>Token: {addresses.token ?? "—"}</li>
          </ul>
        </div>
      </div>

      {demoId && (
        <div className="card bg-base-200">
          <div className="card-body space-y-2">
            <h2 className="card-title">Demo deal — Tesla Cybertruck automated delivery</h2>
            {addresses.assetSerial && (
              <p className="text-sm">
                Asset: <code>{addresses.assetSerial}</code> → machineTokenId{" "}
                <code>{addresses.machineTokenId.toString()}</code>
              </p>
            )}
            {addresses.dealReference && (
              <p className="text-sm">
                Deal: <code>{addresses.dealReference}</code> (automated last-mile delivery)
              </p>
            )}
            {addresses.agreementUrl && (
              <p className="text-sm font-mono break-all">Agreement: {addresses.agreementUrl}</p>
            )}
            {addresses.machineDidUri && (
              <p className="text-sm font-mono break-all">Machine DID: {addresses.machineDidUri}</p>
            )}
            <p className="text-sm">contractId:</p>
            <ContractIdBadge contractId={demoId} />
            {lifecycle && <p className="text-sm">Status: {lifecycle.statusLabel}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/rwa/machines" className="btn btn-outline">
          1. Register machine (Admin)
        </Link>
        <Link href="/rwa/contracts" className="btn btn-outline">
          2. Contract NFTs
        </Link>
        <Link href="/rwa/vault" className="btn btn-outline">
          3. Vault deposit & mint (Alice)
        </Link>
        <Link href="/rwa/invest" className="btn btn-outline">
          4. Transfer tokens (Alice)
        </Link>
        <Link href="/rwa/yield" className="btn btn-outline">
          5. Yield (Alice / Bob)
        </Link>
      </div>
    </div>
  );
}
