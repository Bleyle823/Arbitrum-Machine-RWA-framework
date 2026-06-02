# RWA Arbitrum Contracts (standalone Hardhat)

Self-contained Hardhat project for deploying the RWA framework on **Arbitrum** (or any EVM). No dependency on `peaq-sdk-js-dev`, npm workspaces, or `@peaq-network/rwa`.

You can copy this entire folder anywhere and run it with Node.js 18+.

## Quick start

```bash
cd rwa-hardhat
npm install
cp .env.example .env   # edit DEPLOYER_PRIVATE_KEY for live networks
npm test
npm run deploy:local
```

Deploy output: `deployments/deployment-<chainId>.json`

## Deploy to Arbitrum Sepolia

```bash
# .env: DEPLOYER_PRIVATE_KEY=0x...
# optional: FEE_TOKEN_ADDRESS=<USDC on Arb Sepolia>
npm run deploy:arbitrum-sepolia
```

## What’s inside

| Path | Purpose |
|------|---------|
| `src/` | RWA contracts + vendored ERC-3643 T-REX |
| `scripts/deploy.js` | Bootstrap framework |
| `scripts/fullFlowDemo.js` | End-to-end demo (no SDK) |
| `test/` | Hardhat tests |
| `ARBITRUM.md` | Network-specific deploy guide |
| `TEST_GUIDE.md` | Full workflow checklist |
| `SCAFFOLD_ETH_GUIDE.md` | Optional Scaffold ETH 2 integration |

## Stack

- Solidity **0.8.17**, ERC-3643 T-REX (`src/vendor/erc3643/`)
- ONCHAINID (`@onchain-id/solidity`)
- Default DID prefix: `did:arbitrum:` — optional `did:peaq:` via `InfoDesk.setValue(4, 1)`

## License

- RWA layer: Apache-2.0
- `src/vendor/erc3643/`: GPL-3.0 ([ERC-3643](https://github.com/ERC-3643/ERC-3643))

## Monorepo note

If you cloned `peaq-sdk-js-dev`, this folder is the **canonical** deployable copy. The copy under `packages/rwa/contracts/` is kept in sync for SDK development; use **`rwa-hardhat/`** for standalone deployment.
