# Arbitrum Machine RWA: Comprehensive Run Guide

End-to-end guide for running the **ONCHAINID + ERC-3643 T-REX** RWA framework locally with **Scaffold-ETH 2**, then exercising the full compliant flow from the **Debug UI** (`/debug`).

| Path | Purpose |
|------|---------|
| `frontend/` | Scaffold-ETH 2 app (chain, deploy, UI): **start here** |
| `ARBITRUM_TEST_GUIDE.md` | Arbitrum Sepolia: deploy → bootstrap → `/debug` Sections 1–6 |
| `contracts/` | Standalone Hardhat package (tests, `demo:flow`, Arbitrum scripts) |
| `contracts/SCAFFOLD_ETH_GUIDE.md` | Shorter SE-2-focused reference |
| `contracts/ARBITRUM.md` | Arbitrum Sepolia / mainnet deploy (contracts package) |

---

## 1. What you are running

A compliant RWA pipeline on a local EVM (chain id **31337**):

```text
ONCHAINID identities + KYC claims
        ↓
Machine NFT + multi-party Contract NFT (collateral)
        ↓
ERC-3643 security token vault (T-REX)
        ↓
Mint → compliant transfer → yield
```

**Stack**

- **ONCHAINID** (`@onchain-id/solidity`): proxy identities, ERC-734/735 claims, `ClaimIssuer` validation  
- **RWA layer**: `ArbRwaNft`, `MachineNft`, `ContractNft`, `InfoDesk`, `ArbVault` / `ArbVaultFactory`  
- **ERC-3643 T-REX**: `Token`, `IdentityRegistry`, `ModularCompliance`, `NativeTransferFeeModule`  
- **UI**: Scaffold-ETH 2 at `http://localhost:3000/rwa` (guided app) and `http://localhost:3000/debug` (raw ABI)

**Claim topics** (`RwaConstants.sol`)

| Topic | Value | Used for |
|-------|-------|----------|
| KYC approved | `666` | T-REX investor verification |
| Machine issuer | `7` | `addMachineIssuer` |
| Machine regulator | `8` | `addMachineRegulator` |
| Claim scheme | `1` | ECDSA |
| Investor country (tests) | `276` | Germany: `registerIdentity` |

Role checks on `ArbRwaNft` use `IdFactory.getIdentity(wallet)` + `ClaimIssuer.isClaimValid`. There is **no** `setIssuerIdentity` mapping.

---

## 2. Prerequisites

- **Node.js** ≥ 18  
- **Yarn** (monorepo uses Yarn workspaces)  
- Repo cloned: `Arbitrum-Machine-RWA-framework`

First-time install:

```bash
cd frontend
yarn install
```

---

## 3. Parties and burner wallets

Scaffold-ETH exposes fixed Hardhat accounts in the header **Address** dropdown.

| Index | Role | Default address |
|-------|------|-----------------|
| **#0** | Admin: deployer, framework owner, machine regulator/issuer, claim signer (local) | `0xf39Fd6e51aad88f6F4ce6aB8827279cffFb92266` |
| **#1** | Alice: asset owner, vault controller | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| **#2** | Bob: investor, CNFT counterparty | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| **#3** | Charlie: investor, CNFT counterparty | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| **#4** | Extra signer (optional) | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |

**Who does what**

| Party | Wallet | Responsibilities |
|-------|--------|------------------|
| Admin / Framework owner | #0 | Deploy, vault factory, unpause token, `registerIdentity`, regulator setup |
| Claim issuer | #0 (local) | Signs ONCHAINID claims at deploy/bootstrap |
| Machine regulator | #0 | `addMachineRegulator` |
| Machine issuer | #0 | `registerMachine` on `MachineNft` |
| Alice | #1 | Fees, CNFT init, NFT approvals, `depositAndMint`, transfers, `depositYield` |
| Bob / Charlie | #2 / #3 | `signContract`, receive tokens, `claim` yield |

---

## 4. Quick start (recommended)

### Terminal 1: local chain

```bash
cd frontend
yarn chain
```

Leave running. Chain RPC: `http://127.0.0.1:8545` (Windows: use `127.0.0.1`, not `localhost`).

### Terminal 2: deploy + debug bootstrap

```bash
cd frontend
yarn deploy --tags RwaFramework --reset
```

This single command:

1. Deploys ONCHAINID (`Identity`, `ImplementationAuthority`, `IdFactory`, `ClaimIssuer`)  
2. Deploys `MockFeeToken`, `InfoDesk`, T-REX suite, `ArbRwaNft`, `ArbVaultFactory`, fee module  
3. Mints **10,000** MockFeeToken to accounts **#1–#4**  
4. Runs **debug bootstrap** (unless `SKIP_DEBUG_BOOTSTRAP=true`):  
   - Identities + KYC for Alice, Bob, Charlie  
   - Machine roles for Admin  
   - `MachineNft` + `ContractNft` deployed and saved for `/debug`  
   - Vault created, token **unpaused**, all three investors **registered**  
   - Demo Machine NFT (`tokenId` **202604042**, Tesla Cybertruck fleet unit `VEH-2026-CYBER-DLV-0042`) and completed Contract NFT for Alice  
5. Regenerates `packages/nextjs/contracts/deployedContracts.ts`  
6. Writes `packages/nextjs/public/rwa-manifest.json` (addresses + demo `machineTokenId` / `contractId` / deal metadata)

**Save deploy output**, especially:

```text
Debug UI ready: use these IDs for depositAndMint:
  machineTokenId: 202604042
  assetSerial: VEH-2026-CYBER-DLV-0042
  dealReference: CYBER-AUTO-DELIVERY-2026-0042
  vehicle: Tesla Cybertruck (automated last-mile delivery)
  contractId: <uint256>
  rwaNftAddresses: [<MachineNft>, <ContractNft>]
```

Also note `ArbVault`, `Token`, and `RewardDistributor` addresses from the bootstrap logs.

The same values are written to **`frontend/packages/nextjs/public/rwa-manifest.json`**.

### Terminal 3: frontend

```bash
cd frontend
yarn start
```

Open **http://localhost:3000/rwa** (guided flow) or **http://localhost:3000/debug** (raw contracts).

You do **not** need `yarn issue-claims` after a normal deploy.

#### Pinata (optional: agreement uploads)

In `frontend/packages/nextjs/.env.local`:

```env
PINATA_JWT=<from https://app.pinata.cloud/developers/keys>
NEXT_PUBLIC_GATEWAY_URL=<your-subdomain.mypinata.cloud>
```

Use **RWA App → Contracts → New agreement** to upload a file; the UI sets `url` to `ipfs://<cid>` and `hashDigest` to `keccak256(file bytes)` before `initContractAndSign`.

---

## 5. RWA App (`/rwa`) vs Debug (`/debug`)

| Route | Purpose |
|-------|---------|
| `/rwa` | Dashboard + manifest IDs + phase links |
| `/rwa/machines` | Admin `registerMachine` |
| `/rwa/contracts` | List `contractId` by initiator + manifest demo |
| `/rwa/contracts/new` | Pinata upload + preview `computeContractId` + init |
| `/rwa/contracts/[id]` | Draft status, sign (or “Inactive” if already completed) |
| `/rwa/vault` | NFT approve + `depositAndMint` |
| `/rwa/invest` | Fee approve + `Token.transfer` |
| `/rwa/yield` | `depositYield` / `claim` |

**Contract ID formula** (unchanged):

```text
contractId = uint256(keccak256(abi.encode(initiator, counterparties, hashDigest, url)))
```

On-chain helpers: `ContractNft.computeContractId`, `getDraftStatus`, `getContractDetails`, `getContractIdsByInitiator`.

---

## 6. Contracts on the Debug page

After default deploy, these tabs appear on `/debug`:

| Contract | Purpose |
|----------|---------|
| `MockFeeToken` | Fee / yield ERC-20 (USDC stand-in) |
| `InfoDesk` | Fees, treasuries, DID method |
| `IdFactory` | ONCHAINID identity factory |
| `ClaimIssuer` | KYC / role claim validator |
| `ArbRwaNft` | Registry: regulators, issuers, CNFT deploy |
| `ArbVaultFactory` | Create T-REX vaults |
| `MachineNft` | Machine asset NFTs |
| `ContractNft` | Multi-party agreement NFTs |
| `Token` | ERC-3643 security token |
| `IdentityRegistry` | Per-vault investor registry |
| `ArbVault` | Collateral, mint, fees |
| `RewardDistributor` | Yield pool |
| `NativeTransferFeeModule` | Transfer fee module (proxy) |

Addresses live in `frontend/packages/nextjs/contracts/deployedContracts.ts`.

---

## 7. What deploy already did vs what you do in the UI

| Step | Automated at deploy | Manual on `/debug` |
|------|---------------------|-------------------|
| ONCHAINID identities + KYC (666) | Yes | n/a |
| Machine regulator + issuer + NFT contracts | Yes | n/a |
| Vault + unpause + `registerIdentity` ×3 | Yes | n/a |
| Demo Machine + Contract NFT for Alice | Yes (default) | n/a |
| Approve vault for NFTs | n/a | **Alice**: Phase A |
| `depositAndMint` | n/a | **Alice**: Phase B |
| Token transfers | n/a | **Alice**: Phase C |
| Yield deposit + claim | n/a | **Alice / Bob**: Phase D |

If you used `SKIP_DEMO_ASSETS=true`, also do machine + contract NFT steps manually (Section 8).

---

## 8. Debug UI walkthrough (after default deploy)

Switch the **burner wallet** before each write.

### Phase A: Approve vault for collateral (Alice #1)

**Goal:** Let `ArbVault` pull Alice’s NFTs when minting security tokens.

1. Open **`ArbVault`** on `/debug` → copy its **address** (`vaultAddress`).  
2. **`MachineNft`** → `approve(vaultAddress, 202604042)`  
   - `202604042` = default `machineTokenId` from deploy log / manifest (`VEH-2026-CYBER-DLV-0042`).  
3. **`ContractNft`** → `approve(vaultAddress, contractId)`  
   - `contractId` = value from deploy log.

**What this does:** ERC-721 approval so the vault can escrow NFTs during `depositAndMint`.

---

### Phase B: Deposit collateral and mint (Alice #1)

**Goal:** Lock NFTs in the vault; mint ERC-3643 tokens to Alice.

**Contract:** `ArbVault`  
**Function:** `depositAndMint(rwaNftAddresses, tokenIds, amount)`

| Argument | Example |
|----------|---------|
| `rwaNftAddresses` | `[MachineNft address, ContractNft address]` from deploy log |
| `tokenIds` | `[202604042, contractId]` |
| `amount` | `100000000000000000000` (= 100 tokens, 18 decimals) |

**What this does:** Transfers approved NFTs to the vault and mints the security token amount to Alice. A second `depositAndMint` should revert (`Already minted`).

**Verify:** On **`Token`** → `balanceOf(Alice address)` increased.

---

### Phase C: Compliant transfers (Alice #1 → Bob #2, Charlie #3)

**Goal:** Move security tokens between KYC-registered investors; fee module charges in MockFeeToken.

1. **`ArbVault`** → `transactionFeeAndAccount(transferAmount)`  
   - Example `transferAmount`: `10000000000000000000` (10 tokens).  
   - Note returned **`fee`**.

2. **`MockFeeToken`** (Alice) → `approve(NativeTransferFeeModule address, fee)`  
   - Use the **`NativeTransferFeeModule`** card address on `/debug`.

3. **`Token`** (Alice) → `transfer(Bob address, amount)`  
4. **`Token`** (Alice) → `transfer(Charlie address, amount)`

**What this does:** ERC-3643 transfer runs compliance (KYC, country, fee module). Unregistered addresses **revert**.

**Verify:** `Token.balanceOf(Bob)` increased.

---

### Phase D: Yield (optional)

**Goal:** Alice funds yield; Bob claims (and can redirect to Charlie).

1. **`MockFeeToken`** (Alice) → `approve(RewardDistributor address, yieldAmount)`  
2. **`RewardDistributor`** (Alice) → `depositYield(yieldAmount)`  
3. **`RewardDistributor`** (Bob) → `claim()`  
4. **`RewardDistributor`** (Bob) → `claimTo(Charlie address)` (optional)

**What this does:** Pools yield pro-rata by security token balance; Bob withdraws fee-token yield.

---

## 8. Full manual path (skip bootstrap or custom assets)

Use when `SKIP_DEBUG_BOOTSTRAP=true`, `SKIP_DEMO_ASSETS=true`, or you want to repeat onboarding from scratch.

### 8.1 Deploy without bootstrap

```bash
cd frontend
SKIP_DEBUG_BOOTSTRAP=true yarn deploy --tags RwaFramework --reset
```

Set in `frontend/packages/hardhat/.env`:

```env
CLAIM_ISSUER_ADDRESS=0x...   # from log: ClaimIssuer ONCHAINID (KYC)
```

```bash
cd frontend/packages/hardhat
yarn issue-claims
```

### 8.2 Phase 0: Registry (Admin #0) on `ArbRwaNft`

| Action | What it does |
|--------|----------------|
| `addMachineRegulator(admin)` | Requires ONCHAINID claim **8** on Admin |
| `deployContractNft()` | Deploys `ContractNft`; save returned address |
| `addMachineIssuer(admin)` | Requires claim **7**; deploys `MachineNft` |
| `getMachineNftByIssuer(admin)` | Read `MachineNft` address |

### 8.3 Phase 1: Verify identities

**`IdFactory`** → `getIdentity(alice)` → non-zero.

### 8.4 Phase 2: Machine NFT (Alice + Admin)

| Who | Contract | Action |
|-----|----------|--------|
| Alice | `MockFeeToken` | `approve(MachineNft, fee)`: read fee via `MachineNft.registrationFeeAndAccount(machineValue)` |
| Admin | `MachineNft` | `registerMachine(alice, machineValue, tokenId, did)` |

Default local machine fee after bootstrap: **1%** of `machineValue` (bootstrap sets `InfoDesk` bps). Fresh deploy without bootstrap uses **100%** until you change `InfoDesk` value slot `0`.

### 8.5 Phase 3: Contract NFT (Alice, Bob, Charlie)

| Who | Contract | Action |
|-----|----------|--------|
| Alice | `MockFeeToken` | `approve(ContractNft, InfoDesk.getValue(3))` |
| Alice | `ContractNft` | `initContractAndSign([bob, charlie], hashDigest, url)`: save `contractId` |
| Bob / Charlie | `ContractNft` | `signContract(contractId)` |

### 8.6 Phase 4–5: Vault (Admin)

**Option A: one tx:** `ArbVaultFactory.createVault(...)`  
**Option B: two txs (recommended on mainnet):**

1. `deployTrexVault("Cyber Delivery Vault", "CYBDLV", [claimIssuer], [666], [feeModuleProxy])`  
2. `attachVaultPeers(token, alice, feeToken, [feeModuleProxy])` → read `VaultCreated`  
3. `unpauseVaultToken(vault)`  
4. On `IdentityRegistry`: `registerIdentity(user, identity, 276)` for Alice, Bob, Charlie

Then continue with **Phases A–D** above.

---

## 9. Environment variables

`frontend/packages/hardhat/.env` (optional for local; required for live nets)

| Variable | When |
|----------|------|
| `SKIP_DEBUG_BOOTSTRAP=true` | Deploy framework only; manual `/debug` setup |
| `SKIP_DEMO_ASSETS=true` | Bootstrap without pre-minted Machine/CNFT |
| `CLAIM_ISSUER_ADDRESS` | Required for `yarn issue-claims` if bootstrap skipped |
| `FEE_TOKEN_ADDRESS` | Use real USDC on Arbitrum; else `MockFeeToken` is deployed |
| `DEPLOYER_PRIVATE_KEY` | Arbitrum Sepolia / mainnet deploy |

---

## 10. Alternative runners (no UI)

### Hardhat test (`contracts/` package)

```bash
cd contracts
npm install
npm test
```

### Full scripted demo (localhost)

```bash
# Terminal 1
cd frontend && yarn chain

# Terminal 2
cd contracts
npm run demo:flow:node
```

Same logical flow as the UI; prints vault, token, and distributor addresses.

### Re-issue claims only

```bash
cd frontend/packages/hardhat
yarn issue-claims
```

Idempotent after chain reset only if you redeploy first.

---

## 11. Verification checklist

| Check | Contract | Call | Expected |
|-------|----------|------|----------|
| Identity | `IdFactory` | `getIdentity(alice)` | Non-zero |
| KYC | ONCHAINID identity | `getClaimIdsByTopic(666)` | ≥ 1 claim |
| Machine owner | `MachineNft` | `ownerOf(202604042)` | Alice |
| CNFT owner | `ContractNft` | `ownerOf(contractId)` | Alice |
| Token live | `Token` | `paused()` | `false` |
| Investor | `IdentityRegistry` | `isVerified(bob)` | `true` |
| Mint once | `ArbVault` | second `depositAndMint` | Reverts |
| Transfer | `Token` | `balanceOf(bob)` | Increased after transfer |

---

## 12. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Reads return `0x` / “not a contract” | Chain reset without redeploy → `yarn deploy --reset` + hard refresh browser |
| Missing `MachineNft` / `Token` on `/debug` | Bootstrap failed or skipped: check deploy logs; avoid `SKIP_DEBUG_BOOTSTRAP` for UI testing |
| `addMachineRegulator` / `addMachineIssuer` reverts | Run `yarn issue-claims` or full redeploy with bootstrap |
| `registerMachine` reverts | Alice must `approve` **MachineNft**; Admin must be issuer (#0) |
| Transfer reverts | Investors must be in `IdentityRegistry`; Alice must `approve` fee module for fee |
| `yarn deploy` connection refused | Start `yarn chain` first |
| Windows RPC issues | Hardhat config uses `127.0.0.1:8545` for `default` / `localhost` |
| Mainnet vault deploy OOM / size | Use `deployTrexVault` + `attachVaultPeers` (two txs), not single `createVault` |

---

## 13. Arbitrum Sepolia (testnet UI)

Local UI uses chain **31337** and burner wallets. For **Arbitrum Sepolia** with MetaMask:

1. Configure `frontend/packages/hardhat/.env` (deployer keystore + `ALICE_PRIVATE_KEY` / `BOB_PRIVATE_KEY` / `CHARLIE_PRIVATE_KEY` for full demo seed).  
2. `yarn deploy:arbitrum-sepolia` then `yarn bootstrap:arbitrum-sepolia`.  
3. Follow **`ARBITRUM_TEST_GUIDE.md`** (deploy → bootstrap → `/debug` → Sections 1–6).  

Contract-level deploy notes: `contracts/ARBITRUM.md`. Optional IPFS pin: `yarn pin:demo-agreement` with `PINATA_JWT`.  

---

## 14. Repository map

```text
Arbitrum-Machine-RWA-framework/
├── RUN_GUIDE.md                 ← this file
├── frontend/
│   ├── yarn chain | deploy | start
│   └── packages/
│       ├── hardhat/
│       │   ├── deploy/00_deploy_rwa_framework.ts
│       │   ├── deploy-helpers/debugBootstrap.ts
│       │   └── scripts/issueClaims.ts
│       └── nextjs/              → /debug UI
└── contracts/                   → standalone Hardhat + tests
```

---

## 15. Recommended session order

1. `yarn chain`  
2. `yarn deploy --tags RwaFramework --reset`  
3. `yarn start` → `/debug`  
4. Phases **A → D** (mint, transfer, yield)  
5. `cd contracts && npm test` for regression  
6. Read `contracts/ARBITRUM.md` before testnet deploy  

---

*Last aligned with: ONCHAINID integration, `debugBootstrap` in `00_deploy_rwa_framework.ts`, Scaffold-ETH 2 monorepo under `frontend/`.*
