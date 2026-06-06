export { RWA } from "./rwa.js";

export { Chain, DECIMALS } from "./enums/core.js";
export { ClaimTopics, ClaimScheme } from "./enums/claimTopics.js";

export type { SDKInit, NetworkAddresses } from "./types/core.js";
export type * from "./types/onchainid.js";
export type * from "./types/mnft.js";
export type * from "./types/cnft.js";
export type * from "./types/vault.js";

export { SDKError, isSDKError } from "./errors/errors.js";
export { getAddresses, manifestToAddresses } from "./config/addresses.js";

// Legacy / low-level helpers (viem, manifest, demo constants)
export * from "./constants.js";
export * from "./manifest.js";
export * from "./contractId.js";
export * from "./agreement.js";
export * from "./demoAssets.js";
export * from "./abis.js";
export * from "./claims.js";
export * from "./viem.js";
export * from "./addresses/index.js";
