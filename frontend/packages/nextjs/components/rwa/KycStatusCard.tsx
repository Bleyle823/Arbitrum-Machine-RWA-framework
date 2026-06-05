"use client";

import { type InvestorKey, useInvestorVerification } from "~~/hooks/rwa/useInvestorVerification";
import { useRwaAddresses } from "~~/hooks/rwa/useRwaAddresses";

const labels: Record<InvestorKey, string> = {
  alice: "Alice",
  bob: "Bob",
  charlie: "Charlie",
};

export function KycStatusCard() {
  const { addresses } = useRwaAddresses();
  const { data, isLoading, isError } = useInvestorVerification(addresses.identityRegistry, {
    alice: addresses.alice,
    bob: addresses.bob,
    charlie: addresses.charlie,
  });

  if (!addresses.identityRegistry) return null;

  const allVerified = data && data.alice && data.bob && data.charlie;
  const anyMissing = data && (!data.alice || !data.bob || !data.charlie);

  return (
    <div className={`card bg-base-200 ${anyMissing ? "border border-warning" : ""}`}>
      <div className="card-body space-y-2">
        <h2 className="card-title text-base">KYC on vault registry</h2>
        {isLoading && <span className="loading loading-spinner loading-sm" />}
        {isError && <p className="text-sm text-error">Could not read IdentityRegistry.</p>}
        {data && (
          <ul className="text-sm space-y-1">
            {(Object.keys(labels) as InvestorKey[]).map(key => (
              <li key={key}>
                {labels[key]}:{" "}
                <span className={data[key] ? "text-success font-medium" : "text-warning font-medium"}>
                  {data[key] ? "verified" : "not verified"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {anyMissing && (
          <div className="alert alert-warning py-2 text-sm">
            <span>
              Run <code className="text-xs">yarn issue-claims:arbitrum-sepolia</code> (participant keys in{" "}
              <code className="text-xs">.env</code>), then <code className="text-xs">yarn verify:demo-state</code>.
            </span>
          </div>
        )}
        {allVerified && (
          <p className="text-sm text-success">All investors verified — vault mint and transfers can proceed.</p>
        )}
      </div>
    </div>
  );
}
