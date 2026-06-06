# SDK Installation & Initialization

Read the [user docs](../docs/users/introduction.md) first for framework background.

## Install from npm

```bash
npm install @arbitrum-machine/rwa-sdk ethers
```

## Build from monorepo

```bash
git clone https://github.com/Bleyle823/Arbitrum-Machine-RWA-framework.git
cd sdk
npm install
npm run build
npm test
```

After deploying contracts:

```bash
cd ../frontend && yarn bootstrap:arbitrum-sepolia
cd ../sdk && npm run sync-addresses && npm run build
```

For SDK-only testing without the frontend, see [SDK Standalone Testing](../mintlify/workflows/sdk-standalone.mdx).

## `new RWA(opts)`

Initialize the SDK for a specific Arbitrum network. Resolves contract addresses from the bundled manifest (or a custom `manifest` override).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **chainId** | `Chain` | Yes | `Chain.ARBITRUM_SEPOLIA` (421614) or `Chain.ARBITRUM_ONE` (42161) |
| **provider** | `Provider` | Yes | ethers.js provider for read calls |
| **manifest** | `RwaManifest` | No | Override bundled addresses after redeploy |

### TypeScript

```typescript
import { RWA, Chain } from "@arbitrum-machine/rwa-sdk";
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider(process.env.ARB_SEPOLIA_RPC_URL!);
const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider });

console.log(sdk.getManifest().arbVault);
console.log(sdk.onchainid);
console.log(sdk.vault);
```

### Environment variables (demo)

```bash
ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ALICE_PRIVATE_KEY=0x...
BOB_PRIVATE_KEY=0x...
CHARLIE_PRIVATE_KEY=0x...
```

## Module access

| Property | Module | Domain |
|----------|--------|--------|
| `sdk.onchainid` | `OnChainID` | Identities, KYC, `isVerified` |
| `sdk.mnft` | `MachineNft` | Machine registration, DID reads |
| `sdk.cnft` | `ContractNft` | Multi-party agreements |
| `sdk.vault` | `Vault` | Deposit, mint, transfer, yield |
| `sdk.rwanft` | `ArbRwaNft` | Factory admin (issuers/regulators) |

**Writes:** pass an ethers `Signer` in each method's options object.

[← SDK Reference index](./index.md)
