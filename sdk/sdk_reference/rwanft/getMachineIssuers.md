## `rwanft.getMachineIssuers()`

Fetch the list of Machine Issuer addresses registered in the ArbRwaNft contract. This is a read-only call.

### Parameters
None.

### Returns
| Field | Type | Description |
|-------|------|-------------|
| **machineIssuers** | `string[]` | Array of Machine Issuer addresses. |


### Usage
#### TypeScript
```TypeScript
import 'dotenv/config';
import { RWA, Chain, type SDKInit } from '@arbitrum-machine/rwa-sdk';
import { JsonRpcProvider } from "ethers";

async function main() {
  // 0. Create RWA instance and get provider
  const provider = new JsonRpcProvider(process.env.ARB_SEPOLIA_RPC_URL);
  const init: SDKInit = { chainId: Chain.ARBITRUM_SEPOLIA, provider: provider };
  const rwa_sdk = new RWA(init);

  // 1. Get Machine Issuers
  const result = await rwa_sdk.rwanft.getMachineIssuers();
  console.log("Result", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

#### JavaScript
```js
import 'dotenv/config';
import { RWA, Chain } from "@arbitrum-machine/rwa-sdk";
import { JsonRpcProvider } from "ethers";

async function main() {
  // 0. Create RWA instance and get provider
  const provider = new JsonRpcProvider(process.env.ARB_SEPOLIA_RPC_URL);
  const rwa_sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider: provider });

  // 1. Get Machine Issuers
  const result = await rwa_sdk.rwanft.getMachineIssuers();
  console.log("Result", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Example outputs
```
Result {
  machineIssuers: [
    '0x8BCfa2e9FC4aCa66fCF36Bcf47646E5Fb8d74BA0',
    '0x16cd4D21537eD8F33bE08271A9FA6DCC426709b2'
  ]
}
```
