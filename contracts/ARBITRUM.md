# Arbitrum deployment & test guide

This framework is built for **Arbitrum** (Sepolia first, then mainnet). The workflow is standard EVM + ERC-3643 T-REX; nothing requires peaq network, peaq precompiles, or Agung testnet.

## Architecture on Arbitrum

```
┌─────────────────────────────────────────────────────────────┐
│  Arbitrum Sepolia / One                                     │
├─────────────────────────────────────────────────────────────┤
│  Fee token (USDC) ──► InfoDesk (fees, DID method, treasuries) │
│  IdFactory + ONCHAINID ClaimIssuer ──► RwaIdentity / KYC    │
│  TREXFactory ──► per-vault: Token + IR + ModularCompliance  │
│  PeaqRwaNft ──► MachineNft / ContractNft (collateral)       │
│  PeaqVaultFactory ──► PeaqVault + RewardDistributor         │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

| Item | Arbitrum Sepolia |
|------|------------------|
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` (or Alchemy/Infura) |
| `chainId` | `421614` |
| Gas token | ETH on Arbitrum Sepolia |
| Fee token | USDC (or deploy `MockFeeToken` for dev) |
| Deployer | Funded wallet; `DEPLOYER_PRIVATE_KEY` in `.env` |

## 1. Configure Hardhat

`hardhat.config.js` includes `arbitrumSepolia` when `DEPLOYER_PRIVATE_KEY` is set:

```bash
# ./.env
DEPLOYER_PRIVATE_KEY=0x...
ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
# Optional — USDC on Arbitrum Sepolia (use your verified address)
FEE_TOKEN_ADDRESS=0x...
```

## 2. Deploy framework

```bash
cd .
npm install
npm run compile
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

Deploy script:

- Boots full **T-REX** suite (`TREXImplementationAuthority`, `TREXFactory`, `TREXGateway`)
- Sets **DID method** to Arbitrum (`did:arbitrum:…`)
- Wires `PeaqVaultFactory` as owner of `TREXFactory`
- Writes `deployments/deployment-421614.json`

## 3. Optional: enable peaq-style DIDs

Default machine/regulator URI prefixes:

```text
did:arbitrum:issuer:0x…
did:arbitrum:regulator:0x…
```

To align with peaq SDK / `did:peaq:` naming (metadata only; chain is still Arbitrum):

```javascript
// DID_METHOD_PEAQ = 1  (RwaConstants)
await infoDesk.setValue(4, 1);
```

| `InfoDesk.setValue(4, x)` | Prefix |
|---------------------------|--------|
| `0` | `did:arbitrum:` (default) |
| `1` | `did:peaq:` |
| `2` | `did:rwa:` (legacy) |

Machine NFT **DID document bytes** are still stored on-chain in the NFT; only the string prefix changes. Full peaq protobuf DID blobs can be passed in `registerMachine` regardless of prefix.

## 4. Bootstrap (admin, one-time)

| Step | Contract call |
|------|----------------|
| Regulator | `PeaqRwaNft.addMachineRegulator(addr)` |
| Contract NFT | `PeaqRwaNft.deployContractNft()` |
| Issuer mapping | `setIssuerIdentity(issuer, identity)` then `addMachineIssuer(issuer)` |

## 5. Investor onboarding

Same as any T-REX deployment:

1. `IdFactory.createIdentity(wallet, salt)`
2. ONCHAINID `ClaimIssuer` signs KYC (topic `666`)
3. `RwaIdentity.addClaim(...)`
4. After vault exists: `IdentityRegistry.registerIdentity(wallet, identity, countryCode)` on **that vault’s** T-REX IR

## 6. Create a vault (two transactions recommended)

```javascript
const feeModule = deployment.implementations.nativeTransferFeeModuleProxy;
const issuers = [deployment.onchainid.kycVerifier];
const topics = [666n];

const token = await vaultFactory.deployTrexVault("Asset Pool", "POOL", issuers, topics, [feeModule]);
const [vault, distributor] = await vaultFactory.attachVaultPeers(
  token,
  vaultController,
  usdcAddress,
  [feeModule]
);
await vaultFactory.unpauseVaultToken(vault);
```

## 7. Collateralize & transfer

1. Approve fee token to `MachineNft` → `registerMachine`
2. Sign & complete `ContractNft` if used
3. Approve NFTs to `PeaqVault`
4. `PeaqVault.depositAndMint(nfts, tokenIds, amount)` — mints ERC-3643 tokens
5. Approve fee module for transfer fee → `Token.transfer`

Local reference: `npm test` (Hardhat, no Arbitrum RPC required).

## 8. What is *not* required on Arbitrum

| peaq-specific | Arbitrum approach |
|---------------|-------------------|
| peaq native token precompile `0x809` | Any ERC-20 via `FEE_TOKEN_ADDRESS` |
| Agung / peaq RPC | Arbitrum RPC |
| peaq `TREXGateway` governance on peaq mainnet | Your own `TREXFactory` owner (`PeaqVaultFactory`) |
| `did:peaq:` only | Default `did:arbitrum:`; peaq optional |

## 9. Contract size notes

- `PeaqVaultFactory` and `PeaqRwaNft` are large; Arbitrum allows large contracts, but Ethereum L1 does not.
- `deployTREXSuite` may need **>16.7M gas** in one tx — use `deployTrexVault` + `attachVaultPeers` on strict gas caps.

## 10. Integration with `@peaq-network/rwa` SDK (optional)

The monorepo SDK targets peaq Agung/peaq mainnet address JSON. For Arbitrum:

1. Copy `deployments/deployment-421614.json` into a new addresses file.
2. Point your app at Arbitrum RPC + deployed addresses.
3. Use the same claim topics (`666`, `7`, `8`) and ABIs.
4. Set `InfoDesk` DID method to `peaq` only if you need byte-compatible `did:peaq` strings in metadata.

SDK is **not** required for testing; use [SCAFFOLD_ETH_GUIDE.md](./SCAFFOLD_ETH_GUIDE.md) or Hardhat tests only.
