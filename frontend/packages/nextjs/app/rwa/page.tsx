"use client";

import Link from "next/link";
import { AgreementMetadataLinks } from "~~/components/rwa/AgreementMetadataLinks";
import { ContractIdBadge } from "~~/components/rwa/ContractIdBadge";
import { DemoWorkflowSteps } from "~~/components/rwa/DemoWorkflowSteps";
import { KycStatusCard } from "~~/components/rwa/KycStatusCard";
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
      <WalletRoleHint expected="Alice (#1) for vault & transfers; Admin (#0) for machines; Bob/Charlie for signing" />

      {!manifest && (
        <div className="alert alert-warning">
          <span>
            No <code>rwa-manifest.json</code> found. Run <code>yarn deploy:arbitrum-sepolia</code> then{" "}
            <code>yarn bootstrap:arbitrum-sepolia</code>, then refresh.
          </span>
        </div>
      )}

      {manifest && !addresses.machineNft && (
        <div className="alert alert-warning">
          <span>
            Framework is deployed but vault/NFT contracts are missing. Run <code>yarn bootstrap:arbitrum-sepolia</code>.
          </span>
        </div>
      )}

      {manifest?.contractId === "0" && addresses.machineNft && (
        <div className="alert alert-error">
          <span>
            Demo NFTs not minted (<code>contractId: 0</code>). Set participant keys in <code>packages/hardhat/.env</code>{" "}
            and run <code>yarn seed:demo-assets</code>.
          </span>
        </div>
      )}

      <DemoWorkflowSteps />
      <KycStatusCard />

      {lifecycle?.statusLabel === "Completed" && demoId && (
        <div className="alert alert-success">
          <span>Demo contract is completed — proceed to Vault (step 3).</span>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Deployed addresses</h2>
          <ul className="text-sm space-y-1 font-mono break-all">
            <li>MachineNft: {addresses.machineNft ?? "—"}</li>
            <li>ContractNft: {addresses.contractNft ?? "—"}</li>
            <li>ArbVault: {addresses.arbVault ?? "—"}</li>
            <li>Token: {addresses.token ?? "—"}</li>
            <li>IdentityRegistry: {addresses.identityRegistry ?? "—"}</li>
          </ul>
          <Link href="/debug" className="btn btn-ghost btn-xs mt-2 w-fit">
            Open /debug for raw ABI
          </Link>
        </div>
      </div>

      {demoId && demoId !== 0n && (
        <div className="card bg-base-200">
          <div className="card-body space-y-2">
            <h2 className="card-title text-base">Demo deal — Tesla Cybertruck automated delivery</h2>
            {addresses.assetSerial && (
              <p className="text-sm">
                Asset: <code>{addresses.assetSerial}</code> → machineTokenId{" "}
                <code>{addresses.machineTokenId.toString()}</code>
              </p>
            )}
            {addresses.dealReference && (
              <p className="text-sm">
                Deal: <code>{addresses.dealReference}</code>
              </p>
            )}
            {(addresses.agreementUrl || manifest?.agreementMetadataHash) && (
              <AgreementMetadataLinks
                agreementUrl={addresses.agreementUrl}
                agreementMetadataHash={manifest?.agreementMetadataHash}
              />
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
          Machines
        </Link>
        <Link href="/rwa/contracts" className="btn btn-outline">
          Contract NFTs
        </Link>
        <Link href="/rwa/vault" className="btn btn-outline">
          Vault
        </Link>
        <Link href="/rwa/invest" className="btn btn-outline">
          Transfers
        </Link>
        <Link href="/rwa/yield" className="btn btn-outline">
          Yield
        </Link>
      </div>
    </div>
  );
}
