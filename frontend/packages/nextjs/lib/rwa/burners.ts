/** Default Hardhat / Anvil burner accounts for local UI hints */
export const BURNER_ACCOUNTS = {
  admin: { index: 0, address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const, label: "Admin (issuer)" },
  alice: { index: 1, address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const, label: "Alice" },
  bob: { index: 2, address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const, label: "Bob" },
  charlie: { index: 3, address: "0x90F79bf6EB2c4f870365E7859821662C42b0b0e6" as const, label: "Charlie" },
} as const;

export function burnerLabelForAddress(address?: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const acc of Object.values(BURNER_ACCOUNTS)) {
    if (acc.address.toLowerCase() === lower) return acc.label;
  }
  return null;
}
