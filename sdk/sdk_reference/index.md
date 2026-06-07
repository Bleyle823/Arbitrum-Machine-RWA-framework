# SDK Reference

Complete API documentation for the **Arbitrum Machine RWA SDK**. Function signatures, parameters, return types, and code examples.

> **New to the framework?** Start with the [User Documentation](../docs/users/introduction.md).

## Quick Navigation

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| [Initialization](./initialize.md) | SDK setup | `new RWA()` |
| [Identity](./identity/) | Identity & claims | `createIdentity`, `getIdentity`, `isVerified`, `addClaimToIdentity` |
| [Machine NFT](./mnft/) | Machine registration | `registerMachine`, `getMachineDid`, `ownerOf` |
| [Contract NFT](./cnft/) | Agreements | `createContract`, `signContract`, `computeContractId` |
| [Vault](./vault/) | Vaults & tokens | `depositAndMint`, `transfer`, `depositYield`, `claimYield` |
| [RWA NFT Factory](./rwanft/) | Admin factory | `getMachineIssuers`, `getMachineRegulators` |

## Getting Started

### Installation

```bash
npm install arbitrum-machine-rwa-sdk ethers
```

### Initialization

```typescript
import { RWA, Chain } from "arbitrum-machine-rwa-sdk";
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });
```

→ See [Initialization](./initialize.md) for complete setup.

## Supported Networks

| Network | Chain ID | Enum |
|---------|----------|------|
| Arbitrum One | 42161 | `Chain.ARBITRUM_ONE` |
| Arbitrum Sepolia | 421614 | `Chain.ARBITRUM_SEPOLIA` |

Pass a custom manifest after redeploy:

```typescript
import { parseRwaManifest } from "arbitrum-machine-rwa-sdk";

const sdk = new RWA({
  chainId: Chain.ARBITRUM_SEPOLIA,
  provider,
  manifest: parseRwaManifest(await fetch("/rwa-manifest.json").then(r => r.json())),
});
```

[← Back to README](../README.md)
