/**
 * Production-style demo constants mirrored in standalone contracts package.
 * Keep in sync with frontend/packages/hardhat/deploy-helpers/demoProductionAssets.ts
 */
const hre = require("hardhat");

const DEMO_ASSET_SERIAL = "VEH-2026-CYBER-DLV-0042";
const DEMO_DEAL_REFERENCE = "CYBER-AUTO-DELIVERY-2026-0042";

module.exports = {
  DEMO_MACHINE_TOKEN_ID: 202604042n,
  DEMO_NEXT_MACHINE_TOKEN_ID: 202604043n,
  DEMO_ASSET_SERIAL,
  DEMO_DEAL_REFERENCE,
  DEMO_VAULT_NAME: "Cyber Delivery Vault",
  DEMO_VAULT_SYMBOL: "CYBDLV",
  DEMO_AGREEMENT_IPFS_URL:
    "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzwszojzjbzhcng4xz3fa",
  DEMO_MACHINE_DID_URI: `did:arbitrum:machine:${DEMO_ASSET_SERIAL}`,
  DEMO_NEXT_MACHINE_DID_URI: `did:arbitrum:machine:VEH-2026-CYBER-DLV-0043`,
  DEMO_MACHINE_VALUE: hre.ethers.parseEther("119990"),
  DEMO_AGREEMENT_METADATA: {
    dealRef: DEMO_DEAL_REFERENCE,
    version: "1.0.0",
    assetSerial: DEMO_ASSET_SERIAL,
    vehicleModel: "Tesla Cybertruck",
    useCase: "automated_last_mile_delivery",
    autonomyLevel: "L4_fleet",
    jurisdiction: "US-CA",
    effectiveDate: "2026-01-15",
  },
  demoAgreementHashDigest() {
    const canonical = JSON.stringify(this.DEMO_AGREEMENT_METADATA);
    return hre.ethers.keccak256(hre.ethers.toUtf8Bytes(canonical));
  },
  demoMachineDidBytes() {
    return hre.ethers.toUtf8Bytes(this.DEMO_MACHINE_DID_URI);
  },
};
