# RWA Framework — Comprehensive Test Guide

**Primary deployment target: Arbitrum** ([ARBITRUM.md](./ARBITRUM.md)). This guide describes the full RWA workflow on any EVM chain using this Hardhat project (`rwa-hardhat/`, ERC-3643 T-REX + RWA vault/NFT layer).

An optional **Track C** covers peaq Agung / `@peaq-network/rwa` SDK compatibility. The on-chain flow is the same; only RPC, fee token, and DID prefix differ.

Reference design (peaq docs): [docs.peaq.xyz RWA](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/introduction).

---

## 1. Documentation alignment (peaq MCP review)

Compared against official peaq docs:

| Doc requirement | Official source | Our contracts | Status |
|-----------------|-----------------|---------------|--------|
| ONCHAINID + KYC claims (`CT_KYC_APPROVED = 666`) | [Roles](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `Identity`, `ClaimIssuer`, `IdFactory` | ✅ |
| Role claims `CT_MNFT_ISSUER = 7`, `CT_MNFT_REGULATOR = 8` | [Roles](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `RwaConstants`, SDK `signClaim` format | ✅ |
| Machine Regulator appoints issuers via `PeaqRwaNft.addMachineIssuer` | [Machine Issuer flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/machine-issuer-flow) | `PeaqRwaNft` deploys `MachineNft` per issuer | ✅ |
| Machine NFT + embedded DID, ERC-20 registration fee | [Modules / mnft](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/modules) | `MachineNft.registerMachine` | ✅ |
| Contract NFT draft → sign → complete | [Modules / cnft](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/modules) | `ContractNft` | ✅ |
| Vault factory deploys Vault + Token + RewardDistributor | [Roles / Vault Factory](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `PeaqVaultFactory.createVault` | ✅ |
| Per-vault Identity Registry + KYC verification | [Roles / Users](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `IdentityRegistry.isVerified` | ✅ |
| T-REX transfer compliance + fee module | [Modules / vault](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/modules) | T-REX `Token` + `ModularCompliance`, `NativeTransferFeeModule` | ✅ |
| Single `depositAndMint` per vault | [Roles / Vault Owner](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `PeaqVault.minted` guard | ✅ |
| Yield deposit + claim + claimTo | [Common flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/common-flow) | `RewardDistributor` | ✅ |
| InfoDesk as config hub (fees, implementations) | [Roles / InfoDesk](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles) | `InfoDesk` | ✅ |
| 10-step common flow (identities → yield) | [Common flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/common-flow) | Covered below | ✅ |

### Intentional differences (chain-agnostic deployment)

| Reference (peaq) | Arbitrum / EVM deployment | Notes |
|-----------------|-------------------|-------|
| `did:peaq:` machine DIDs | Default `did:arbitrum:`; set `InfoDesk.setValue(4, 1)` for `did:peaq:` | Protobuf DID blob in `registerMachine` unchanged; only URI prefix differs |
| InfoDesk precompile addresses | Not used | Point `setContract(0, feeToken)` at any ERC-20 on your chain |
| On-chain regulator claim check | `addMachineRegulator` by Framework Owner | Regulator **claim** is still required by docs for governance; call `setIssuerIdentity` before `addMachineIssuer` |
| `PeaqVaultFactory` bytecode size | ~34 KB | Enable `allowUnlimitedContractSize` on testnets (Agung does this) or split factory in a future release |

---

## 2. Test tracks

Choose one track based on what you are validating:

| Track | What it tests | Command |
|-------|---------------|---------|
| **A — Contract unit (Hardhat)** | Solidity logic only, no SDK | `npm test` (from this directory) |
| **B — SDK integration (local fork)** | Full `@peaq-network/rwa` against your deployment | See §5 |
| **C — SDK integration (Agung / peaq)** | Live testnet against official or your deployment | See §6 |

---

## 3. Prerequisites

### Wallets & roles

You need **seven distinct EOAs** (or fewer if one wallet plays multiple roles in dev):

| Role | Env prefix | Responsibilities |
|------|------------|------------------|
| Framework Owner / Admin | `ADMIN_*` | Deploy framework, `IdFactory.createIdentity`, `createVault`, `unpauseVaultToken`, `registerIdentity` |
| Claim Issuer | `CLAIM_ISSUER_*` | Sign KYC and role claims |
| Machine Regulator | `MACHINE_REGULATOR_*` | `addMachineIssuer`, `setMachineNftBlockState` |
| Machine Issuer | `MACHINE_ISSUER_*` | `registerMachine` |
| Alice (asset owner / vault controller) | `ALICE_*` | Receives MNFTs, creates CNFT, deposits to vault, transfers, deposits yield |
| Bob (investor / counterparty) | `BOB_*` | Signs CNFT, receives tokens, claims yield |
| Charlie (investor / counterparty) | `CHARLIE_*` | Signs CNFT, receives tokens |

Each participant wallet needs:
- **Native gas token** for transaction fees
- **Fee ERC-20** (peaq wrapped token on Agung, or USDC/MFT on other chains) for machine registration, contract setup, and transfer fees

### Software

```bash
# Contracts
cd .
npm install
npm run compile

# Optional: any client SDK that reads deployments/deployment-<chainId>.json
```

---

## 4. Track A — Hardhat contract test (automated)

This runs the abbreviated end-to-end flow in `test/RwaFullFlow.test.js`:

```bash
cd .
npm test
```

**What it covers:**

1. Deploy `MockFeeToken`, `InfoDesk`, `IdFactory`, `ClaimIssuer`, `PeaqRwaNft`
2. Create identities + KYC claims (Alice, Bob)
3. Machine issuer role claim + `addMachineIssuer` + `registerMachine`
4. Deploy compliance module proxy + `createVault` + `unpauseVaultToken`
5. Register identities in vault IR
6. `depositAndMint` → transfer with fee → assert balances

**Expected:** `1 passing`

---

## 5. Track B — Full SDK test on local Hardhat network

### Step B.0 — Deploy framework

```bash
cd .
npm run deploy:local
```

Copy `deployments/deployment-31337.json` into your client config (e.g. `addresses/local.json`):

```json
{
  "chainId": 31337,
  "network": "hardhat",
  "onchainid": {
    "idFactory": "<from deployment>",
    "kycVerifier": "<ClaimIssuer address>",
    "implementationAuthority": "<admin>",
    "mnftIssuerVerifier": "<ClaimIssuer>",
    "mnftRegulatorVerifier": "<ClaimIssuer>"
  },
  "trex": {
    "trexImplementationAuthority": "",
    "iaFactory": "",
    "trexFactory": "",
    "trexGateway": ""
  },
  "nft": { "peaqRwaNft": "<PeaqRwaNft>" },
  "vault": {
    "factory": "<PeaqVaultFactory>",
    "proxyAdmin": "<admin>"
  },
  "erc20": { "peaq": "<fee token>" }
}
```

Wire `Chain.LOCAL` in SDK enums/config if not present, or test with raw addresses passed to each SDK method.

### Step B.1 — Framework bootstrap (one-time, Admin)

| # | Action | SDK / contract call | Verify |
|---|--------|---------------------|--------|
| 1 | Add machine regulator | `PeaqRwaNft.addMachineRegulator(regulatorAddr)` | `getMachineRegulators()` includes address |
| 2 | Deploy Contract NFT instance | `PeaqRwaNft.deployContractNft()` or `addContractNft()` | Event `ContractNftAdded`; save address |
| 3 | Register issuer identity mapping | `PeaqRwaNft.setIssuerIdentity(issuer, identity)` | Required before step 4 in our contracts |

### Step B.2 — Machine issuer onboarding

Follow [Machine Issuer flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/machine-issuer-flow):

| # | Who | SDK call | Verify |
|---|-----|----------|--------|
| 1 | Admin | `onchainid.createIdentity({ subject: issuer })` | `getIdentity` → `found` |
| 2 | Claim Issuer | `onchainid.issueRoleClaim({ topic: CT_MNFT_ISSUER })` | Returns `{ claim, signature }` |
| 3 | Issuer | `onchainid.addClaimToIdentity(...)` | `getClaim` returns KYC/role data |
| 4 | Admin | `setIssuerIdentity(issuer, identity)` on PeaqRwaNft | On-chain mapping set |
| 5 | Regulator | `rwanft.addMachineIssuer({ newMachineIssuer })` | Event `MachineIssuerAdded(issuer, machineNft)`; save **machineNft** address |

### Step B.3 — Common flow (10 steps)

Matches [Common flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/common-flow):

#### Phase 1 — Onboard participants

| Step | Who | SDK | Expected result |
|------|-----|-----|-----------------|
| 1 | Admin | `createIdentity` for Alice, Bob, Charlie | `status: 'created'` or `'exists'` |
| 2 | Claim Issuer + each user | `issueKycClaim` + `addClaimToIdentity` | `getClaim` succeeds; topic `666` |

#### Phase 2 — Asset side

| Step | Who | SDK | Expected result |
|------|-----|-----|-----------------|
| 3a | Alice | `mnft.ensureMachineNftAllowance({ machineController: alice, machineNft, erc20, machineValueHuman })` | `approved` or `already_sufficient`; note `feePerMachine` |
| 3b | Machine Issuer | `mnft.registerMachine({ machineControllerAddr: alice, machineNft, salt, count })` | `MachineAdded` events; save **machineIds** |
| 4a | Alice | `cnft.createContract({ contractNft, counterparties: [bob, charlie], contractHash, url })` | `contractId` from `ContractInitiated` |
| 4b | Bob, Charlie | `cnft.signContract({ contractId })` each | Last sign emits `ContractCompleted` |

#### Phase 3 — Vault & token

| Step | Who | SDK | Expected result |
|------|-----|-----|-----------------|
| 5a | Admin | `vault.createVault({ vaultController: alice, vaultFactory, infoDesk, trustedClaimIssuers, tokenName, tokenSymbol, payoutToken })` | `VaultCreated` → save vault, token, distributor |
| 5b | Admin | `vault.unpauseToken({ vault, vaultFactory })` | `status: 'unpaused'` |
| 6 | Admin | `vault.registerIdentity` for Alice, Bob, Charlie | `status: 'registered'` each |

#### Phase 4 — Collateralize & mint

| Step | Who | SDK | Expected result |
|------|-----|-----|-----------------|
| 7 | Alice | `vault.nftApproval` for each machineId + contractId | `approved` |
| 8 | Alice | `vault.depositAndMint({ rwaNfts: [mnft, cnft], tokenIds: [...], amount })` | `deposited_and_minted`; token balance > 0 |

#### Phase 5 — Transfers & yield

| Step | Who | SDK | Expected result |
|------|-----|-----|-----------------|
| 9a | Alice | `vault.ensureTransferFeeAllowance` then `vault.transfer` → Bob | Bob token balance increases |
| 9b | Alice | Same → Charlie | Charlie token balance increases |
| 10a | Alice | `vault.depositYield({ erc20: payoutToken, humanReadableAmount })` | Distributor balance up |
| 10b | Bob | `vault.claimYield` | Bob receives ERC-20 yield |
| 10c | Bob | `vault.claimYieldTo({ to: charlie })` | Charlie receives ERC-20 |

Wire the same addresses into your application’s integration tests.

---

## 6. Track C — Agung / peaq testnet (optional)

Deploy this project on Agung if you need peaq chain parity. Use `deployments/deployment-<chainId>.json` with any client.

### Network config

```bash
HTTPS_BASE_URL="https://peaq-agung.api.onfinality.io/public"
```

### Agung-specific notes (from peaq docs + maintainer guides)

- Set `allowUnlimitedContractSize: true` when deploying `PeaqVaultFactory` (same as official peaq-rwa-evm deploy scripts).
- Fee token on Agung is typically `0x0000000000000000000000000000000000000809` (native peaq ERC-20 precompile).
- Fund every test wallet with Agung PEAQ **and** enough fee-token balance for machine registration (fee ≈ machine value when `VAL_MACHINE_FEE_BPS = 10000`).

Run your client integration tests against the Agung deployment JSON.

---

## 7. Per-module verification checklist

Use this when debugging a single layer.

### Identity (`sdk.onchainid`)

- [ ] `createIdentity` with unique `deploymentSalt` per wallet
- [ ] `issueKycClaim` signature verifies via `ClaimIssuer.isClaimValid`
- [ ] `addClaimToIdentity` only callable by identity owner/manager
- [ ] `getClaim` returns topic `666` for investors

### RWA NFT factory (`sdk.rwanft`)

- [ ] Regulator in `getMachineRegulators()`
- [ ] `addMachineIssuer` emits new `machineNft` address
- [ ] `getMachineNftByIssuer(issuer)` matches deployed `MachineNft`
- [ ] `findContractNft(contractId)` resolves after CNFT completion

### Machine NFT (`sdk.mnft`)

- [ ] `registrationFeeAndAccount(machineValue)` returns `(fee, account)` where `account` is MachineNft address
- [ ] Machine owner approved fee token to MachineNft **before** `registerMachine`
- [ ] `getMachineDid(tokenId)` returns deserialized DID document

### Contract NFT (`sdk.cnft`)

- [ ] `isContractIdAvailable` true before create
- [ ] `getDraft` shows initiator + partial signatures
- [ ] `getContract` available after all parties sign
- [ ] `ownerOf(contractId)` is initiator after completion

### Vault (`sdk.vault`)

- [ ] Token starts **paused**; `unpauseVaultToken` required before transfers
- [ ] `registerIdentity` before `depositAndMint` (recipients must be `isVerified`)
- [ ] `depositAndMint` reverts on second call (`Already minted`)
- [ ] `ensureTransferFeeAllowance` before `transfer` (1% default via InfoDesk)
- [ ] `rewardDistributor` address from vault matches `depositYield` / `claimYield` target

---

## 8. Negative tests (compliance must fail closed)

Run these to confirm regulation works:

| Scenario | Expected revert |
|----------|-----------------|
| Transfer tokens to unregistered address | `Recipient not verified` |
| Transfer without fee ERC-20 allowance | `Insufficient allowance` / compliance reject |
| `registerMachine` without issuer role / mapping | `Missing issuer claim` |
| `depositAndMint` twice on same vault | `Already minted` |
| `signContract` by non-counterparty | `Not participant` |
| Transfer while token paused | `Paused` |

---

## 9. Event reference (assert in explorers or tests)

| Contract | Event | When |
|----------|-------|------|
| `IdFactory` | `WalletLinked` | Identity created |
| `Identity` | `ClaimAdded` | KYC / role claim attached |
| `PeaqRwaNft` | `MachineIssuerAdded` | New issuer + MNFT deployed |
| `MachineNft` | `MachineAdded` | Machine registered |
| `ContractNft` | `ContractCompleted` | All signatures collected |
| `PeaqVaultFactory` | `VaultCreated` | Vault + token + distributor |
| `PeaqVault` | `Deposited`, `Minted` | Collateral locked, tokens minted |
| `SecurityToken` | `Transfer` | Compliant token movement |
| `RewardDistributor` | `YieldDeposited`, `Claimed` | Yield lifecycle |

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Missing issuer claim` on `addMachineIssuer` | Issuer identity not mapped | Call `setIssuerIdentity(issuer, identity)` as Framework Owner |
| `ERC20: insufficient allowance` on `registerMachine` | Wrong approve spender | Approve **MachineNft contract address** (returned by `registrationFeeAndAccount`) |
| `Recipient not verified` on transfer | Missing vault IR registration | Admin calls `registerIdentity` for recipient |
| `Compliance rejected` on transfer | Fee module allowance | Run `ensureTransferFeeAllowance` first |
| `Already minted` | Second deposit attempt | Expected — one deposit per vault by design |
| Factory deploy fails (code too large) | 24 KB mainnet limit | Use Agung / `allowUnlimitedContractSize` or split factory |
| Client `Unsupported chainId` | Address JSON missing | Add `deployments/deployment-<chainId>.json` to your app config |

---

## 11. Recommended test order for a new chain deployment

1. `npm test` in `.` (Track A)
2. Deploy via `scripts/deploy.js`; save JSON
3. Bootstrap regulator + issuer (Track B.1–B.2)
4. Run `npm run demo:flow` or your client against the deployment JSON
5. Run negative tests (§8)
6. External audit before mainnet

---

## 12. Official documentation links

- [RWA Introduction](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/introduction)
- [Roles & Responsibilities](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/roles)
- [Modules overview](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/modules)
- [Common flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/common-flow)
- [Machine issuer flow](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/workflows/machine-issuer-flow)
- [SDK initialization](https://docs.peaq.xyz/peaqchain/sdk-reference/rwa/initialize)

Reference workflows: [peaq RWA docs](https://docs.peaq.xyz/peaqchain/build/advanced-operations/rwa/introduction).
