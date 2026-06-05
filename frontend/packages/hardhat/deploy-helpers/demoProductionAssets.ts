import { ethers } from "ethers";

/** Production-style fleet asset registry id (uint160-safe). */
export const DEMO_MACHINE_TOKEN_ID = 202604042n;

/** Internal asset serial — maps 1:1 to machineTokenId in fleet ops DB. */
export const DEMO_ASSET_SERIAL = "VEH-2026-CYBER-DLV-0042";

/** Commercial agreement reference (legal / CRM). */
export const DEMO_DEAL_REFERENCE = "CYBER-AUTO-DELIVERY-2026-0042";

/** Suggested id for registering a second fleet vehicle locally. */
export const DEMO_NEXT_MACHINE_TOKEN_ID = 202604043n;

export const DEMO_NEXT_ASSET_SERIAL = "VEH-2026-CYBER-DLV-0043";

export const DEMO_NEXT_DEAL_REFERENCE = "CYBER-AUTO-DELIVERY-2026-0043";

/** ERC-3643 vault branding for the demo deal. */
export const DEMO_VAULT_NAME = "Cyber Delivery Vault";
export const DEMO_VAULT_SYMBOL = "CYBDLV";

/**
 * IPFS CID for canonical `demo-agreement-metadata.json` (keccak256 of JSON = agreementMetadataHash).
 * Pin with `yarn pin:demo-agreement` (PINATA_JWT) so public gateways resolve the CID.
 */
export const DEMO_AGREEMENT_IPFS_CID = "bafybeihkyr6b2jkti2vzu3p5ahg7mmqd6pqvmu7e5ecmz3rvrim2une2su";

/** Stored on-chain as `url` in ContractNft — not fetched by contracts. */
export const DEMO_AGREEMENT_IPFS_URL = `ipfs://${DEMO_AGREEMENT_IPFS_CID}`;

/** App-hosted byte-identical copy (always works at http://localhost:3000/... when yarn start). */
export const DEMO_AGREEMENT_LOCAL_PATH = "/demo-agreement-metadata.json";

/** Vehicle DID stored as UTF-8 bytes in registerMachine (matches InfoDesk default did:arbitrum: method). */
export const DEMO_MACHINE_DID_URI = `did:arbitrum:machine:${DEMO_ASSET_SERIAL}`;

export const DEMO_NEXT_MACHINE_DID_URI = `did:arbitrum:machine:${DEMO_NEXT_ASSET_SERIAL}`;

/** Valuation passed to registerMachine (MockFeeToken / 18 decimals — Cybertruck MSRP stand-in). */
export const DEMO_MACHINE_VALUE = ethers.parseEther("119990");

/** Canonical agreement JSON — hashDigest = keccak256(bytes) in production. */
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

export function demoAgreementHashDigest(): string {
  const canonical = JSON.stringify(DEMO_AGREEMENT_METADATA);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

export function demoMachineDidBytes(): Uint8Array {
  return ethers.toUtf8Bytes(DEMO_MACHINE_DID_URI);
}

/** @deprecated use DEMO_DEAL_REFERENCE — kept for manifest hashLabel field label */
export const DEMO_AGREEMENT_HASH_LABEL = DEMO_DEAL_REFERENCE;
