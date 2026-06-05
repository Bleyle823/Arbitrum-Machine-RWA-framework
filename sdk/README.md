# @arbitrum-machine/rwa-sdk

TypeScript SDK for the **Arbitrum Machine RWA framework** — ONCHAINID + ERC-3643 vaults, Machine/Contract NFTs, and demo helpers.

## Install

```bash
npm install @arbitrum-machine/rwa-sdk viem
# optional — ONCHAINID claim signing (Hardhat scripts, backend)
npm install ethers
```

## Quick start

```ts
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import {
  getDeployment,
  readIsVerified,
  encodeDepositAndMint,
  computeContractId,
  demoAgreementHashDigest,
  DEMO_AGREEMENT_IPFS_URL,
} from "@arbitrum-machine/rwa-sdk";

const manifest = getDeployment(421614)!;
const client = createPublicClient({ chain: arbitrumSepolia, transport: http() });

const aliceVerified = await readIsVerified(
  client,
  manifest.identityRegistry as `0x${string}`,
  manifest.alice as `0x${string}`,
);

const calldata = encodeDepositAndMint(manifest);
```

## Exports

| Module | Contents |
|--------|----------|
| **manifest** | `RwaManifest`, `parseRwaManifest`, `fetchRwaManifest` |
| **addresses** | `getDeployment(chainId)`, bundled Arbitrum Sepolia manifest |
| **abis** | Extended viem ABIs for vault, NFTs, token, fee module |
| **contractId** | `computeContractId`, IPFS URL helpers |
| **demoAssets** | Cybertruck demo constants, `demoAgreementHashDigest()` |
| **claims** | ONCHAINID KYC claim helpers (requires `ethers`) |
| **viem** | `readIsVerified`, `encodeDepositAndMint`, fee/balance reads |

Subpath imports:

```ts
import { arbVaultExtendedAbi } from "@arbitrum-machine/rwa-sdk/abis";
import { getDeployment } from "@arbitrum-machine/rwa-sdk/addresses";
```

## Sync addresses after deploy

From repo root (after `yarn bootstrap:arbitrum-sepolia`):

```bash
cd sdk
yarn sync-addresses
yarn build
```

## Build & publish

```bash
cd sdk
yarn install
yarn build
npm login
npm publish --access public
```

## Peer dependencies

- **viem** `^2.21` — read helpers and calldata encoding
- **ethers** `^6.13` (optional) — `addClaim` / KYC flows

## License

Apache-2.0
