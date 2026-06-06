# RWA Framework — Comprehensive Test Guide

**Primary deployment target: Arbitrum** ([ARBITRUM.md](./ARBITRUM.md)). This guide describes the full RWA workflow on any EVM chain using this Hardhat project (`rwa-hardhat/`, ERC-3643 T-REX + RWA vault/NFT layer).

An optional **Track C** covers Arbitrum Sepolia / `@arbitrum-machine/rwa-sdk` SDK compatibility. The on-chain flow is the same; only RPC, fee token, and DID prefix differ.

---

## 1. Documentation alignment (design review)

| Requirement | Our contracts | Status |
|-------------|---------------|--------|
| ONCHAINID + KYC claims (`CT_KYC_APPROVED = 666`) | `Identity`, `ClaimIssuer`, `IdFactory` | ✅ |
| Role claims `CT_MNFT_ISSUER = 7`, `CT_MNFT_REGULATOR = 8` | `RwaConstants`, SDK claim helpers | ✅ |
| Machine Regulator appoints issuers via `ArbRwaNft.addMachineIssuer` | `ArbRwaNft` deploys `MachineNft` per issuer | ✅ |
| Machine NFT + embedded DID, ERC-20 registration fee | `MachineNft.registerMachine` | ✅ |
| Contract NFT draft → sign → complete | `ContractNft` | ✅ |
| Vault factory deploys Vault + Token + RewardDistributor | `ArbVaultFactory.createVault` | ✅ |
| Per-vault Identity Registry + KYC verification | `IdentityRegistry.isVerified` | ✅ |
| T-REX transfer compliance + fee module | T-REX `Token` + `ModularCompliance`, `NativeTransferFeeModule` | ✅ |
| Single `depositAndMint` per vault | `ArbVault.minted` guard | ✅ |
| Yield deposit + claim + claimTo | `RewardDistributor` | ✅ |
| InfoDesk as config hub (fees, implementations) | `InfoDesk` | ✅ |
| 10-step common flow (identities → yield) | Covered below | ✅ |

### Intentional differences (chain-agnostic deployment)

| Reference design | Arbitrum / EVM deployment | Notes |
|-----------------|-------------------|-------|
| `did:arbitrum:` machine DIDs | Default `did:arbitrum:`; set `InfoDesk.setValue(4, 1)` for `did:arbitrum:` | Protobuf DID blob in `registerMachine` unchanged; only URI prefix differs |
| InfoDesk precompile addresses | Not used | Point `setContract(0, feeToken)` at any ERC-20 on your chain |
| On-chain regulator claim check | `addMachineRegulator` by Framework Owner | Regulator must hold valid ONCHAINID claim topic **8** from configured ClaimIssuer |
| `ArbVaultFactory` bytecode size | ~34 KB | Enable `allowUnlimitedContractSize` on testnets (Arbitrum Sepolia does this) or split factory in a future release |

---

## 2. Test tracks

Choose one track based on what you are validating:

| Track | What it tests | Command |
|-------|---------------|---------|
| **A — Contract unit (Hardhat)** | Solidity logic only, no SDK | `npm test` (from this directory) |
| **B — SDK integration (local fork)** | Full `@arbitrum-machine/rwa-sdk` against your deployment | See §5 |
| **C — SDK integration (Arbitrum Sepolia)** | Live testnet against your deployment | See §6 |

---

## 3. Prerequisites

### Wallets & roles

You need **seven distinct EOAs** (or fewer if one wallet plays multiple roles in dev):

| Role | Env prefix | Responsibilities |
|------|------------|------------------|
| Framework Owner / Admin | `ADMIN_*` | Deploy framework, ONCHAINID `IdFactory.createIdentity`, `createVault`, `unpauseVaultToken`, `registerIdentity` |
| Claim Issuer | `CLAIM_ISSUER_*` | Sign KYC and role claims |
| Machine Regulator | `MACHINE_REGULATOR_*` | `addMachineIssuer`, `setMachineNftBlockState` |
| Machine Issuer | `MACHINE_ISSUER_*` | `registerMachine` |
| Alice (asset owner / vault controller) | `ALICE_*` | Receives MNFTs, creates CNFT, deposits to vault, transfers, deposits yield |
| Bob (investor / counterparty) | `BOB_*` | Signs CNFT, receives tokens, claims yield |
| Charlie (investor / counterparty) | `CHARLIE_*` | Signs CNFT, receives tokens |

Each participant wallet needs:
- **Native gas token** for transaction fees
- **Fee ERC-20** (MockFeeToken on Arbitrum Sepolia demo, or USDC/MFT on other chains) for machine registration, contract setup, and transfer fees

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

1. Deploy `MockFeeToken`, `InfoDesk`, `IdFactory`, `ClaimIssuer`, `ArbRwaNft`
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
  "nft": { "arbRwaNft": "<ArbRwaNft>" },
  "vault": {
    "factory": "<ArbVaultFactory>",
    "proxyAdmin": "<admin>"
  },
  "erc20": { "feeToken": "<fee token>" }
}
```

Wire `Chain.LOCAL` in SDK enums/config if not present, or test with raw addresses passed to each SDK method.

### Step B.1 — Framework bootstrap (one-time, Admin)

| # | Action | SDK / contract call | Verify |
|---|--------|---------------------|--------|
| 1 | Add machine regulator | `ArbRwaNft.addMachineRegulator(regulatorAddr)` | `getMachineRegulators()` includes address |
| 2 | Deploy Contract NFT instance | `ArbRwaNft.deployContractNft()` or `addContractNft()` | Event `ContractNftAdded`; save address |
| 3 | Issue machine issuer claim (topic 7) on ONCHAINID identity | `issueClaims.js` or manual `addClaim` | Required before `addMachineIssuer` |

### Step B.2 — Machine issuer onboarding

Follow the machine issuer workflow (`sdk/sdk_reference/workflows/machine_issuer_flow.md`):

| # | Who | SDK call | Verify |
|---|-----|----------|--------|
| 1 | Admin | `onchainid.createIdentity({ subject: issuer })` | `getIdentity` → `found` |
| 2 | Claim Issuer | `onchainid.issueRoleClaim({ topic: CT_MNFT_ISSUER })` | Returns `{ claim, signature }` |
| 3 | Issuer | `onchainid.addClaimToIdentity(...)` | `getClaim` returns KYC/role data |
| 4 | Admin | `addMachineRegulator` + `addMachineIssuer` (claims validated on-chain) | No manual identity mapping |
| 5 | Regulator | `rwanft.addMachineIssuer({ newMachineIssuer })` | Event `MachineIssuerAdded(issuer, machineNft)`; save **machineNft** address |

### Step B.3 — Common flow (10 steps)

Matches the common flow (`sdk/sdk_reference/workflows/common_flow.md`):

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

## 6. Track C — Arbitrum Sepolia testnet (optional)

Deploy this project on Arbitrum Sepolia. Use `deployments/deployment-<chainId>.json` with any client.

### Network config

```bash
ARB_SEPOLIA_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
```

### Arbitrum Sepolia-specific notes

- Set `allowUnlimitedContractSize: true` when deploying `ArbVaultFactory` on testnets.
- Fee token on the demo deployment is **MockFeeToken** (see `deployments/deployment-421614.json`).
- Fund every test wallet with ETH for gas **and** enough fee-token balance for machine registration (fee ≈ machine value when `VAL_MACHINE_FEE_BPS = 10000`).

Run your client integration tests against the Arbitrum Sepolia deployment JSON.

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
| `ArbRwaNft` | `MachineIssuerAdded` | New issuer + MNFT deployed |
| `MachineNft` | `MachineAdded` | Machine registered |
| `ContractNft` | `ContractCompleted` | All signatures collected |
| `ArbVaultFactory` | `VaultCreated` | Vault + token + distributor |
| `ArbVault` | `Deposited`, `Minted` | Collateral locked, tokens minted |
| `SecurityToken` | `Transfer` | Compliant token movement |
| `RewardDistributor` | `YieldDeposited`, `Claimed` | Yield lifecycle |

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Missing issuer claim` on `addMachineIssuer` | No valid topic-7 claim on ONCHAINID identity | Run `issue-claims` or `addClaim` with configured ClaimIssuer |
| `ERC20: insufficient allowance` on `registerMachine` | Wrong approve spender | Approve **MachineNft contract address** (returned by `registrationFeeAndAccount`) |
| `Recipient not verified` on transfer | Missing vault IR registration | Admin calls `registerIdentity` for recipient |
| `Compliance rejected` on transfer | Fee module allowance | Run `ensureTransferFeeAllowance` first |
| `Already minted` | Second deposit attempt | Expected — one deposit per vault by design |
| Factory deploy fails (code too large) | 24 KB mainnet limit | Use Arbitrum Sepolia / `allowUnlimitedContractSize` or split factory |
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

## 12. Project documentation links

- SDK Mintlify docs: `sdk/mintlify/` (run `mintlify dev` from that folder)
- SDK reference: `sdk/sdk_reference/`
- User guides: `sdk/docs/users/`
- Maintainer guides: `sdk/docs/sdk_maintainers/`
- Arbitrum deploy notes: [ARBITRUM.md](./ARBITRUM.md)
