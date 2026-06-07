# Arbitrum Machine RWA Framework

On-chain infrastructure for tokenizing physical machines on **Arbitrum**: from verified identity and NFT collateral through ERC-3643 security tokens and yield distribution.

**[Why Machine RWA →](https://arbitrum-machine-rwa-docs.vercel.app/concepts/vision)**: vision, compliance-by-design, and modular integration.

The framework combines [**ONCHAINID**](https://github.com/onchain-id/solidity), [**T-REX (ERC-3643)**](https://github.com/ERC-3643/ERC-3643), and **ERC-721** (Machine NFT + Contract NFT) into a single compliant RWA pipeline.

```
Identity + KYC  →  Machine / Contract NFTs  →  Arb Vault  →  Security tokens + yield
```

## Live deployments

| Resource | URL |
|----------|-----|
| **Landing site** | https://arbitrum-machine-rwa-landing.vercel.app |
| **Scaffold demo** (`/rwa` UI) | https://arbitrum-machine-rwa-scaffold.vercel.app/rwa |
| **Debug contracts UI** | https://arbitrum-machine-rwa-scaffold.vercel.app/debug |
| **Mintlify documentation** | https://arbitrum-machine-rwa-docs.vercel.app |

Connect MetaMask to **Arbitrum Sepolia** to use the hosted demo. Docs and demo auto-deploy from this repo via Vercel.

## Repository layout

| Directory | Purpose | Package manager |
|-----------|---------|-----------------|
| [`contracts/`](./contracts/) | Standalone Hardhat contracts and unit tests | npm |
| [`frontend/`](./frontend/) | Scaffold-ETH 2 app: deploy scripts, `/rwa` UI, `/debug` | Yarn |
| [`sdk/`](./sdk/) | TypeScript SDK `arbitrum-machine-rwa-sdk`, Mintlify docs, scripts | npm |

**Networks:** Arbitrum Sepolia (421614) and Robinhood Chain Testnet (46630) for development; Arbitrum One (42161) for production.

## What you can build

1. Register machines as NFTs with embedded DID documents  
2. Record multi-party agreements as Contract NFTs  
3. Lock collateral in an **Arb Vault** and mint fractional ERC-3643 tokens  
4. Transfer tokens to KYC-verified investors and distribute yield pro-rata  

## Quick start

### SDK only (integrators)

Test the workflow without the frontend: npm only in `sdk/`:

```bash
cd sdk
npm install
cp .env.example .env   # RPC + Alice/Bob/Charlie keys
npm run build
npm test
npm run verify:workflow
```

Docs: [SDK README](./sdk/README.md) · [Manual testing (SDK)](https://arbitrum-machine-rwa-docs.vercel.app/workflows/manual-testing-sdk)

### Frontend + deploy (full stack)

Deploy contracts and use the RWA UI on a testnet:

```bash
cd frontend
yarn install
cp packages/hardhat/.env.example packages/hardhat/.env
# Arbitrum Sepolia (default reference network)
yarn deploy:arbitrum-sepolia
yarn bootstrap:arbitrum-sepolia   # optional: seeds demo state

# Robinhood Chain Testnet (chainId 46630)
yarn deploy:robinhood-testnet
yarn bootstrap:robinhood-testnet  # optional: seeds demo state

yarn start
```

Open [http://localhost:3000/rwa](http://localhost:3000/rwa) locally, or try the [hosted demo](https://arbitrum-machine-rwa-scaffold.vercel.app/rwa) (MetaMask on Arbitrum Sepolia or Robinhood Chain Testnet).

Docs: [Manual testing (Scaffold-ETH)](https://arbitrum-machine-rwa-docs.vercel.app/workflows/manual-testing-scaffold)

### Contracts only (Hardhat)

```bash
cd contracts
npm install
npm test
npm run deploy:arbitrum-sepolia
```

See [contracts/TEST_GUIDE.md](./contracts/TEST_GUIDE.md) and [contracts/ARBITRUM.md](./contracts/ARBITRUM.md).

## Documentation

**Hosted docs:** https://arbitrum-machine-rwa-docs.vercel.app

Local preview:

```bash
cd sdk/mintlify
mintlify dev
```

| Guide | Description |
|-------|-------------|
| [Introduction](https://arbitrum-machine-rwa-docs.vercel.app/introduction) | Framework overview and Sepolia addresses |
| [Core modules](https://arbitrum-machine-rwa-docs.vercel.app/concepts/modules) | `onchainid`, `mnft`, `cnft`, `vault`, `rwanft` |
| [Roles](https://arbitrum-machine-rwa-docs.vercel.app/concepts/roles) | Framework Owner, Claim Issuer, issuers, investors |
| [Common flow](https://arbitrum-machine-rwa-docs.vercel.app/workflows/common-flow) | End-to-end SDK workflow |
| [Smart contract testing](https://arbitrum-machine-rwa-docs.vercel.app/smart-contracts/guide) | Hardhat deploy and verification |

Source files live under [`sdk/mintlify/`](./sdk/mintlify/). Synced copy under [`docs/mintlify/`](./docs/mintlify/) for publishing.

## SDK example

```typescript
import { JsonRpcProvider } from "ethers";
import { RWA, Chain } from "arbitrum-machine-rwa-sdk";

const provider = new JsonRpcProvider(process.env.ARB_SEPOLIA_RPC_URL);
const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });

const { verified } = await sdk.onchainid.isVerified({ wallet: sdk.getManifest().alice });
console.log("Alice verified:", verified);
```

After redeploying contracts:

```bash
cd sdk && npm run sync-addresses && npm run build
```

## License

Apache-2.0: see [sdk/LICENSE](./sdk/LICENSE) and per-package licenses where applicable.
