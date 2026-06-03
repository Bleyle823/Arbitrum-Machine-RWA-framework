/** Production-style demo constants (mirror hardhat deploy-helpers/demoProductionAssets.ts). */
export const DEMO_MACHINE_TOKEN_ID = 202604042n;
export const DEMO_ASSET_SERIAL = "VEH-2026-CYBER-DLV-0042";
export const DEMO_DEAL_REFERENCE = "CYBER-AUTO-DELIVERY-2026-0042";
export const DEMO_NEXT_MACHINE_TOKEN_ID = 202604043n;
export const DEMO_NEXT_ASSET_SERIAL = "VEH-2026-CYBER-DLV-0043";
export const DEMO_NEXT_DEAL_REFERENCE = "CYBER-AUTO-DELIVERY-2026-0043";
export const DEMO_VAULT_NAME = "Cyber Delivery Vault";
export const DEMO_VAULT_SYMBOL = "CYBDLV";
export const DEMO_AGREEMENT_IPFS_URL =
  "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzwszojzjbzhcng4xz3fa";
export const DEMO_MACHINE_DID_URI = `did:arbitrum:machine:${DEMO_ASSET_SERIAL}`;
export const DEMO_NEXT_MACHINE_DID_URI = `did:arbitrum:machine:${DEMO_NEXT_ASSET_SERIAL}`;
export const DEMO_MACHINE_VALUE_WEI = 119990n * 10n ** 18n;
/** Human-readable units for registerMachine (MockFeeToken stand-in). */
export const DEMO_MACHINE_VALUE_UNITS = "119990";

export const DEMO_AGREEMENT_METADATA = {
  dealRef: DEMO_DEAL_REFERENCE,
  version: "1.0.0",
  assetSerial: DEMO_ASSET_SERIAL,
  vehicleModel: "Tesla Cybertruck",
  useCase: "automated_last_mile_delivery",
  autonomyLevel: "L4_fleet",
  jurisdiction: "US-CA",
  effectiveDate: "2026-01-15",
} as const;
