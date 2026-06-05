/** Default Hardhat / Anvil burner accounts for local UI hints */
export const BURNER_ACCOUNTS = {
  admin: { index: 0, address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const, label: "Admin (issuer)" },
  alice: { index: 1, address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const, label: "Alice" },
  bob: { index: 2, address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const, label: "Bob" },
  charlie: { index: 3, address: "0x90F79bf6EB2c4f870365E7859821662C42b0b0e6" as const, label: "Charlie" },
} as const;

/** Arbitrum Sepolia test participants (override via NEXT_PUBLIC_* env vars). */
export const TESTNET_PARTICIPANTS = {
  alice: {
    address: (process.env.NEXT_PUBLIC_ALICE_ADDRESS ?? "0xdEBC58A3CE140Ef84E5757013c1998FdAfDB44D6") as `0x${string}`,
    label: "Alice",
  },
  bob: {
    address: (process.env.NEXT_PUBLIC_BOB_ADDRESS ?? "0xc67c0d1d4e12D838f3ed2fC6241D8e65Dfb3100B") as `0x${string}`,
    label: "Bob",
  },
  charlie: {
    address: (process.env.NEXT_PUBLIC_CHARLIE_ADDRESS ?? "0xe62803A1A219Be5f0D437ed9F84F2e4CDc8A3Ca1") as `0x${string}`,
    label: "Charlie",
  },
} as const;

export function burnerLabelForAddress(address?: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const acc of Object.values(BURNER_ACCOUNTS)) {
    if (acc.address.toLowerCase() === lower) return acc.label;
  }
  for (const acc of Object.values(TESTNET_PARTICIPANTS)) {
    if (acc.address.toLowerCase() === lower) return acc.label;
  }
  return null;
}

export function roleLabelForAddress(address?: string, manifest?: { alice?: string; bob?: string; charlie?: string; admin?: string } | null): string | null {
  const fromBurners = burnerLabelForAddress(address);
  if (fromBurners) return fromBurners;
  if (!address || !manifest) return null;
  const lower = address.toLowerCase();
  if (manifest.alice?.toLowerCase() === lower) return "Alice";
  if (manifest.bob?.toLowerCase() === lower) return "Bob";
  if (manifest.charlie?.toLowerCase() === lower) return "Charlie";
  if (manifest.admin?.toLowerCase() === lower) return "Admin (issuer)";
  return null;
}
