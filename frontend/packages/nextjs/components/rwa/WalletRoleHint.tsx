"use client";

import { burnerLabelForAddress, roleLabelForAddress } from "~~/lib/rwa/burners";
import { useRwaManifest } from "~~/hooks/rwa/useRwaManifest";

export function WalletRoleHint({ expected }: { expected: string }) {
  return (
    <div className="alert alert-info text-sm">
      <span>
        Connect the wallet for <strong>{expected}</strong> (Burner Wallet on local Hardhat; MetaMask on Arbitrum Sepolia).
      </span>
    </div>
  );
}

export function ConnectedWalletBadge({ address }: { address?: string }) {
  const { manifest } = useRwaManifest();
  const label = roleLabelForAddress(address, manifest) ?? burnerLabelForAddress(address);
  if (!address) return <span className="text-warning">Not connected</span>;
  return (
    <span>
      {label ? `${label} — ` : ""}
      <code className="text-xs">{address}</code>
    </span>
  );
}
