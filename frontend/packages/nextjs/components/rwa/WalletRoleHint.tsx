"use client";

import { burnerLabelForAddress } from "~~/lib/rwa/burners";

export function WalletRoleHint({ expected }: { expected: string }) {
  return (
    <div className="alert alert-info text-sm">
      <span>
        Use burner wallet: <strong>{expected}</strong>. Connect via the wallet button (Burner Wallet on localhost).
      </span>
    </div>
  );
}

export function ConnectedWalletBadge({ address }: { address?: string }) {
  const label = burnerLabelForAddress(address);
  if (!address) return <span className="text-warning">Not connected</span>;
  return (
    <span>
      {label ? `${label} — ` : ""}
      <code className="text-xs">{address}</code>
    </span>
  );
}
