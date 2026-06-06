# SDK Maintainer Guide

Guides for deploying the Arbitrum Machine RWA framework and keeping the SDK in sync.

## Contents

| Guide | Description |
|-------|-------------|
| [Deploy Framework](./deployFramework.md) | Deploy contracts to Arbitrum Sepolia |
| [Update Framework](./updateFramework.md) | Refresh addresses after redeploy |
| [Tests](./tests/initialize.md) | Run unit and integration tests |

## Quick sync after bootstrap

```bash
cd frontend
yarn deploy:arbitrum-sepolia
yarn bootstrap:arbitrum-sepolia

cd ../sdk
yarn sync-addresses   # merges manifest + IdFactory/ClaimIssuer/ArbVaultFactory
yarn build
yarn test
```

## Package scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Bundle ESM + CJS + declarations |
| `npm test` | Vitest unit + consumer tests |
| `yarn sync-addresses` | Copy `rwa-manifest.json` + framework deployments |

## Repository layout

```
sdk/
├── src/
│   ├── rwa.ts              # RWA entry class
│   ├── modules/            # onchainid, mnft, cnft, vault, rwanft
│   ├── config/addresses.ts # Chain → manifest mapping
│   └── …                   # legacy viem helpers, ABIs, demo constants
├── docs/users/             # Conceptual guides
├── sdk_reference/          # API reference
└── tests/                  # vitest
```
