# Arbitrum deployment & test guide

This framework is built for **Arbitrum** (Sepolia first, then mainnet). The workflow is standard EVM + ERC-3643 T-REX; nothing requires another network, chain precompiles, or Arbitrum Sepolia testnet.

## Architecture on Arbitrum

```
+-------------------------------------------------------------+
¦  Arbitrum Sepolia / One                                     ¦
+-------------------------------------------------------------¦
¦  Fee token (USDC) --? InfoDesk (fees, DID method, treasuries) ¦
¦  ONCHAINID IdFactory + ClaimIssuer --? proxy identities / KYC ¦
¦  TREXFactory --? per-vault: Token + IR + ModularCompliance  ¦
¦  ArbRwaNft --? MachineNft / ContractNft (collateral)       ¦
¦  ArbVaultFactory --? ArbVault + RewardDistributor         ¦
+-------------------------------------------------------------+
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
# Optional: USDC on Arbitrum Sepolia (use your verified address)
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
- Wires `ArbVaultFactory` as owner of `TREXFactory`
- Writes `deployments/deployment-421614.json`

## 3. Optional: enable legacy DIDs

Default machine/regulator URI prefixes:

```text
did:arbitrum:issuer:0x…
did:arbitrum:regulator:0x…
```

To use an alternate DID prefix (metadata only; chain is still Arbitrum):

```javascript
// DID_METHOD_LEGACY = 1  (RwaConstants)
await infoDesk.setValue(4, 1);
```

| `InfoDesk.setValue(4, x)` | Prefix |
|---------------------------|--------|
| `0` | `did:arbitrum:` (default) |
| `1` | `did:rwa:` (legacy alternate) |
| `2` | `did:rwa:` (legacy) |

Machine NFT **DID document bytes** are still stored on-chain in the NFT; only the string prefix changes. Full standard protobuf DID blobs can be passed in `registerMachine` regardless of prefix.

## 4. Bootstrap (admin, one-time)

| Step | Contract call |
|------|----------------|
| Regulator | `ArbRwaNft.addMachineRegulator(addr)` |
| Contract NFT | `ArbRwaNft.deployContractNft()` |
| Machine roles | Issue claims topics **7** (issuer) / **8** (regulator) on ONCHAINID identity, then `addMachineRegulator` / `addMachineIssuer` |

## 5. Investor onboarding

Same as any T-REX deployment:

1. ONCHAINID `IdFactory.createIdentity(wallet, salt)`
2. `ClaimIssuer` signs KYC (topic `666`): use `npm run issue-claims` after deploy
3. Identity owner calls `addClaim` on the proxy identity (or use `scripts/lib/claims.js`)
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

1. Approve fee token to `MachineNft` ? `registerMachine`
2. Sign & complete `ContractNft` if used
3. Approve NFTs to `ArbVault`
4. `ArbVault.depositAndMint(nfts, tokenIds, amount)`: mints ERC-3643 tokens
5. Approve fee module for transfer fee ? `Token.transfer`

Local reference: `npm test` (Hardhat, no Arbitrum RPC required).

## 8. What is *not* required on Arbitrum

| Other-chain patterns | Arbitrum approach |
|----------------------|-------------------|
| Native fee token precompile | Any ERC-20 via `FEE_TOKEN_ADDRESS` |
| Non-Arbitrum RPC endpoints | Arbitrum RPC |
| External `TREXGateway` governance | Your own `TREXFactory` owner (`ArbVaultFactory`) |
| Fixed DID prefix | Default `did:arbitrum:`; configurable via `InfoDesk` |

## 9. Contract size notes

- `ArbVaultFactory` and `ArbRwaNft` are large; Arbitrum allows large contracts, but Ethereum L1 does not.
- `deployTREXSuite` may need **>16.7M gas** in one tx: use `deployTrexVault` + `attachVaultPeers` on strict gas caps.

## 10. Integration with `arbitrum-machine-rwa-sdk` (optional)

The monorepo SDK targets Arbitrum Sepolia/Arbitrum mainnet address JSON. For Arbitrum:

1. Copy `deployments/deployment-421614.json` into a new addresses file.
2. Point your app at Arbitrum RPC + deployed addresses.
3. Use the same claim topics (`666`, `7`, `8`) and ABIs.
4. Set `InfoDesk` DID method via `setValue(4, n)` if you need a non-default DID prefix in metadata.

SDK is **not** required for testing; use [SCAFFOLD_ETH_GUIDE.md](./SCAFFOLD_ETH_GUIDE.md) or Hardhat tests only.

## Robinhood Chain Testnet (optional)

The monorepo also supports **Robinhood Chain Testnet** (chain id `46630`) for framework deploy and bootstrap.

| Item | Value |
|------|-------|
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| `chainId` | `46630` |
| Env var | `ROBINHOOD_TESTNET_RPC_URL` |
| Explorer | `https://explorer.testnet.chain.robinhood.com` |

From `frontend/`:

```bash
yarn deploy:robinhood-testnet
yarn bootstrap:robinhood-testnet   # optional demo state
```

Artifacts: `frontend/packages/hardhat/deployments/robinhoodChainTestnet/`.

**Framework deployment addresses** (reference):

| Contract | Address |
|----------|---------|
| `ArbRwaNft` | `0xf4e6f7408f2a760f3cbadb14c26fd2c90a3cb611` |
| `ArbVaultFactory` | `0x0b6e3595bbcef688fa2cc288732ae8ac09947398` |
| `IdFactory` | `0x06A326c6F64984bfB07f4a0f1dcaF4D90a936c38` |
| `ClaimIssuer` | `0xCAE0bB0E82BBCbeD3eB3089Df64cc4071b53524f` |
| `MockFeeToken` | `0xc7e34d7722b056f6adf0a4371a6246bf26464189` |

The standalone `contracts/` package includes `robinhoodChainTestnet` in `hardhat.config.js` when `DEPLOYER_PRIVATE_KEY` is set.
