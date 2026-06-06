# Arbitrum Machine RWA SDK

The **Arbitrum Machine Real World Asset (RWA) SDK** enables the tokenization of physical assets on **Arbitrum**. It provides a TypeScript/JavaScript interface for creating compliant security tokens that represent fractionalized ownership of machines and equipment.

## What This SDK Does

- **Tokenize machines** as NFTs with embedded DID documents
- **Fractionalize ownership** into T-REX (ERC-3643) compliant security tokens
- **Manage compliance** through on-chain KYC via ONCHAINID
- **Distribute yield** automatically to token holders

## Documentation

| Section | Description | Audience |
|---------|-------------|----------|
| **[Introduction](./mintlify/introduction.mdx)** | Framework overview, standards, Sepolia addresses | Everyone |
| **[Core modules](./mintlify/concepts/modules.mdx)** | `onchainid`, `mnft`, `cnft`, `vault`, `rwanft` | Everyone |
| **[Roles & responsibilities](./mintlify/concepts/roles.mdx)** | Framework Owner through Investor | Everyone |
| **[Manual testing — SDK](./mintlify/workflows/manual-testing-sdk.mdx)** | Hands-on workflow via TypeScript + SDK | Integrators |
| **[Manual testing — Scaffold-ETH](./mintlify/workflows/manual-testing-scaffold.mdx)** | Hands-on workflow via `/rwa` UI + MetaMask | QA / demos |
| **[Learn the Framework](./docs/users/introduction.md)** | Understand the RWA ecosystem, roles, and concepts | Everyone |
| **[SDK Reference](./sdk_reference/)** | API documentation with code examples | Developers |
| **[Maintainer Guide](./docs/sdk_maintainers/)** | Deploy, update, and test the framework / SDK | SDK Maintainers |

### Educational Documentation

| Guide | What You'll Learn |
|-------|-------------------|
| [Introduction](./docs/users/introduction.md) | Framework overview and SDK architecture |
| [Roles & Responsibilities](./docs/users/roles/index.md) | Framework Owner, Claim Issuers, Machine Issuers, Users |
| [Core Concepts](./docs/users/concepts/index.md) | Identity, Claims, MachineNFTs, Vaults, Security Tokens |

### SDK Reference

| Module | Purpose |
|--------|---------|
| [Initialization](./sdk_reference/initialize.md) | SDK setup and configuration |
| [Identity](./sdk_reference/identity/) | Create identities, issue and manage claims |
| [RWA NFT](./sdk_reference/rwanft/) | Machine regulators, issuers, block state |
| [Contract NFT](./sdk_reference/cnft/) | Create, sign, cancel contracts |
| [Machine NFT](./sdk_reference/mnft/) | Register machines, read DID documents |
| [Vault](./sdk_reference/vault/) | Create vaults, mint tokens, manage yield |
| [Common Workflows](./sdk_reference/workflows/) | End-to-end integrator flows |

## Quick Start

```typescript
import { RWA, Chain } from "@arbitrum-machine/rwa-sdk";
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });

const { verified } = await sdk.onchainid.isVerified({ wallet: sdk.getManifest().alice });
console.log("Alice verified:", verified);
```

## Install

```bash
npm install @arbitrum-machine/rwa-sdk ethers
# optional — viem read helpers and calldata encoding
npm install viem
```

**Monorepo (before publish):**

```bash
cd sdk
npm install
npm run build
npm test
```

## Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Arbitrum RWA SDK                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  onchainid  │ │    mnft     │ │    cnft     │            │
│  │  (Identity) │ │ (Machines)  │ │ (Contracts) │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐                            │
│  │    vault    │ │   rwanft    │                            │
│  │  (Tokens)   │ │  (Factory)  │                            │
│  └─────────────┘ └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Read operations:** use the `provider` passed at initialization  
**Write operations:** pass a `Signer` to each module method

## Supported Networks

| Network | Chain ID | Enum |
|---------|----------|------|
| Arbitrum One | 42161 | `Chain.ARBITRUM_ONE` |
| Arbitrum Sepolia | 421614 | `Chain.ARBITRUM_SEPOLIA` |

## Sync Addresses After Deploy

**SDK-only (npm — no Yarn):**

```bash
cd sdk
npm run sync-addresses
npm run build
npm run verify:workflow
```

See **[SDK standalone testing](./mintlify/workflows/sdk-standalone.mdx)** for every command to test the full workflow from `sdk/` alone.

**After a fresh monorepo deploy** (optional — only if you redeployed contracts):

```bash
cd frontend && yarn bootstrap:arbitrum-sepolia
cd ../sdk && npm run sync-addresses && npm run build
```

## Legacy Helpers

The package also exports low-level **viem** helpers (`readIsVerified`, `encodeDepositAndMint`), manifest parsers, demo constants, and extended ABIs for apps that prefer direct contract access.

## License

Apache-2.0
