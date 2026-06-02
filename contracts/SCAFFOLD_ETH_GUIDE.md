# Testing RWA Contracts in Scaffold ETH 2 (No SDK)

This guide tests **`rwa-hardhat`** using only **Hardhat + ethers + Scaffold ETH 2** on a **local EVM** (same flow as **Arbitrum** deployment). No peaq SDK or Agung required.

Primary production target: **Arbitrum** — see [ARBITRUM.md](./ARBITRUM.md).

---

## What you are testing

| Layer | Contracts |
|-------|-----------|
| Config | `InfoDesk`, `MockFeeToken` |
| Identity | `IdFactory`, `Identity`, `ClaimIssuer` |
| NFT registry | `PeaqRwaNft`, `MachineNft`, `ContractNft` |
| Vault | `PeaqVaultFactory`, `PeaqVault`, `SecurityToken`, `RewardDistributor` |
| Compliance | `Compliance`, `NativeTransferFeeModuleImpl`, `ModuleProxy` |

**Claim topics (on-chain constants):**

| Topic | Value |
|-------|-------|
| KYC approved | `666` |
| Machine issuer | `7` |
| Machine regulator | `8` |

---

## Option A — Hardhat only (fastest)

Everything works with plain Hardhat. No Scaffold ETH required for automated tests.

```bash
cd .
npm install
npm test                    # unit test: identity → machine → vault → transfer
npm run deploy:local        # writes deployments/deployment-31337.json
```

**Full 10-step demo script (no SDK):**

```bash
npm run demo:flow          # in-process Hardhat network (single terminal)
```

Or against a persistent node (Scaffold ETH `yarn chain` / `npx hardhat node`):

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npm run demo:flow:node
```

Set `blockGasLimit: 100_000_000` and `allowUnlimitedContractSize: true` in Hardhat config (required for `PeaqVaultFactory`).

---

## Option B — Scaffold ETH 2 UI + local chain

Use this when you want **burner wallets**, **Contract UI**, and a **Next.js debug frontend** without the peaq SDK.

### 1. Create a Scaffold ETH project

```bash
npx create-eth@latest rwa-scaffold
# Choose: Hardhat flavor, TypeScript, default template
cd rwa-scaffold
yarn install
```

Docs: [Scaffold ETH environment](https://docs.scaffoldeth.io/quick-start/environment)

### 2. Copy contracts

Copy the entire Solidity tree into SE-2:

```powershell
# From this project root (Windows)
xcopy /E /I packages\rwa\contracts\src rwa-scaffold\packages\hardhat\contracts\rwa
```

Or manually copy these folders into `packages/hardhat/contracts/rwa/`:

- `core/`, `identity/`, `registry/`, `compliance/`, `nft/`, `vault/`, `token/`, `interfaces/`, `test/MockFeeToken.sol`

Update SPDX paths if needed — imports use `@openzeppelin/contracts` and relative `../interfaces/`.

### 3. Install OpenZeppelin 4.9.6

SE-2 may ship a different OZ version. Match this repo:

```bash
cd packages/hardhat
yarn add @openzeppelin/contracts@4.9.6
```

### 4. Patch Hardhat config

Edit `packages/hardhat/hardhat.config.ts`:

```typescript
solidity: {
  version: "0.8.24",
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
  },
},
networks: {
  hardhat: {
    allowUnlimitedContractSize: true, // PeaqVaultFactory exceeds 24 KB
  },
  // ... keep existing localhost / sepolia entries
},
```

`PeaqVaultFactory` is ~34 KB. Local Hardhat and peaq Agung allow oversized bytecode; Ethereum mainnet does not.

### 5. Add deploy script

Copy the bundled deploy script:

```
./scaffold-eth/deploy/01_deploy_rwa_framework.ts
  → rwa-scaffold/packages/hardhat/deploy/01_deploy_rwa_framework.ts
```

Remove or rename the template `00_deploy_your_contract.ts` so it does not clash.

Deploy:

```bash
# Terminal 1
yarn chain

# Terminal 2
yarn deploy --tags RwaFramework

# Terminal 2 (required for identity/KYC)
# Copy ClaimIssuer address from deploy output into packages/hardhat/.env as CLAIM_ISSUER_ADDRESS
yarn issue-claims

# Terminal 3
yarn start
```

Open `http://localhost:3000`. SE-2 auto-generates `packages/nextjs/contracts/deployedContracts.ts` with ABIs and addresses.

### 6. Copy tests (optional)

Copy into `packages/hardhat/test/`:

- `./test/RwaFullFlow.test.js`

Run:

```bash
yarn hardhat:test
```

---

## Role map (Hardhat / SE-2 default accounts)

Use these indices when calling contracts from the UI or console:

| Index | Role | Typical actions |
|-------|------|-----------------|
| `#0` | Framework admin | Deploy, `addMachineRegulator`, `createVault`, `unpauseVaultToken`, `registerIdentity` |
| `#1` | Alice | Asset owner: approve fees, receive MNFT/CNFT, `depositAndMint`, transfer, `depositYield` |
| `#2` | Bob | Sign CNFT, receive tokens, `claim` yield |
| `#3` | Charlie | Sign CNFT, receive tokens |
| `#4` | Claim issuer signer | Off-chain `signMessage` for claims (same wallet can be `#0` in dev) |

In Scaffold ETH, switch accounts via the **Address** dropdown (burner wallets).

---

## Manual test flow (Contract UI / Hardhat console)

All calls are direct contract interactions — **no SDK**.

### Phase 0 — Bootstrap (account `#0`)

1. `PeaqRwaNft.addMachineRegulator(<admin>)`
2. `PeaqRwaNft.deployContractNft()` → save CNFT address
3. `IdFactory.createIdentity(<issuer>, "issuer-salt")` (ONCHAINID `IdFactory`, proxy-based identities)
4. Issue a role claim topic `7` (machine issuer) to the issuer identity (see [Claim signing](#claim-signing-without-sdk))
5. `PeaqRwaNft.addMachineIssuer(<issuer>)` → save `MachineNft` from event

### Phase 1 — Identities + KYC

For Alice, Bob, Charlie (`#1`, `#2`, `#3`):

1. `IdFactory.createIdentity(wallet, uniqueSalt)`
2. Add KYC claim topic `666` to each identity with a ClaimIssuer signature (see [Claim signing](#claim-signing-without-sdk)).
   Note: ONCHAINID Identity requires the caller to have a purpose-3 (claim) key; the `yarn issue-claims` script handles this automatically.

### Phase 2 — Machine NFT (issuer `#0`, owner Alice `#1`)

1. `MockFeeToken.approve(machineNft, machineValue)` — Alice approves **MachineNft address**
2. `MachineNft.registerMachine(alice, machineValue, tokenId, didBytes)`

Fee = `machineValue * 100%` (default `VAL_MACHINE_FEE_BPS = 10000`).

### Phase 3 — Contract NFT (Alice initiates, Bob + Charlie sign)

1. Alice: `MockFeeToken.approve(contractNft, setupFee)`
2. Alice: `ContractNft.initContractAndSign([bob, charlie], hashDigest, url)`
3. Bob: `ContractNft.signContract(contractId)`
4. Charlie: `ContractNft.signContract(contractId)`
5. Assert `ownerOf(contractId) == Alice`

### Phase 4 — Vault

1. Deploy fee module proxy (one-time per vault):

   ```javascript
   const impl = await NativeTransferFeeModuleImpl.deploy();
   const init = impl.interface.encodeFunctionData("initialize", [infoDesk]);
   const proxy = await ModuleProxy.deploy(impl, init);
   ```

2. Admin: `PeaqVaultFactory.createVault(alice, "Solar Vault", "SOLAR", feeToken, 0x0, [claimIssuer], [666], [feeModule])`
3. Parse `VaultCreated` event → vault, token, distributor
4. Admin: `PeaqVaultFactory.unpauseVaultToken(vault)`
5. Admin: `IdentityRegistry.registerIdentity(user, identity, 276)` for each investor

### Phase 5 — Collateralize & mint (Alice)

1. `MachineNft.approve(vault, machineTokenId)`
2. `ContractNft.approve(vault, contractId)`
3. `PeaqVault.depositAndMint([machineNft, contractNft], [machineId, contractId], amount)`

### Phase 6 — Transfer (Alice → Bob)

1. Read fee: `PeaqVault.transactionFeeAndAccount(amount)`
2. `MockFeeToken.approve(feeModule, fee)`
3. `SecurityToken.transfer(bob, amount)`

### Phase 7 — Yield

1. Alice: `MockFeeToken.approve(distributor, yieldAmount)`
2. Alice: `RewardDistributor.depositYield(yieldAmount)`
3. Bob: `RewardDistributor.claim()`
4. Bob: `RewardDistributor.claimTo(charlie)` (optional)

---

## Claim signing (without SDK)

Claims use `signMessage` over a keccak256 payload — same as `scripts/lib/claims.js`:

```javascript
const payload = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "bytes"],
    [identityAddress, 666n, kycDataBytes]
  )
);
const signature = await claimIssuerSigner.signMessage(ethers.getBytes(payload));
await identityContract.addClaim(666n, 1n, claimIssuerAddress, signature, kycDataBytes, "uri");
```

KYC data encoding:

```javascript
ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "string", "string"],
  ["Alice", "Test", "1990-01-01", "Berlin"]
);
```

---

## Hardhat console recipe

With `yarn chain` running:

```bash
cd packages/hardhat
yarn hardhat console --network localhost
```

Paste helpers from `./scripts/lib/claims.js`, then call contracts by address from `deployedContracts.ts` or deploy output.

---

## Optional: custom Debug Contracts page (SE-2)

Add a page under `packages/nextjs/app/debug/` that:

1. Reads addresses from `deployedContracts.ts`
2. Uses `useScaffoldWriteContract` / `useScaffoldReadContract` for:
   - `createIdentity`
   - `registerMachine`
   - `depositAndMint`

Example pattern (SE-2 hooks):

```tsx
const { writeContractAsync } = useScaffoldWriteContract({ contractName: "IdFactory" });
await writeContractAsync({ functionName: "createIdentity", args: [userAddress, "salt-1"] });
```

No peaq SDK imports — only `@scaffold-eth/nextjs` generated hooks.

---

## Verification checklist

| Step | Read call | Expected |
|------|-----------|----------|
| Identity exists | `IdFactory.getIdentity(alice)` | Non-zero address |
| KYC | `Identity.hasClaimTopic(666)` | `true` |
| Machine owner | `MachineNft.ownerOf(tokenId)` | Alice |
| CNFT complete | `ContractNft.ownerOf(contractId)` | Alice |
| Token unpaused | `SecurityToken.paused()` | `false` |
| Investor verified | `IdentityRegistry.isVerified(bob)` | `true` |
| Minted once | second `depositAndMint` | reverts `Already minted` |
| Transfer | `SecurityToken.balanceOf(bob)` | increased |
| Yield | `RewardDistributor.claim()` | fee token to Bob |

---

## Negative tests (must revert)

| Action | Expected |
|--------|----------|
| Transfer to unregistered wallet | compliance / not verified |
| `registerMachine` without issuer claim | `Missing issuer claim` |
| `addMachineIssuer` without issuer role claim | `Missing issuer claim` |
| Transfer without fee allowance | allowance / compliance error |
| `depositAndMint` twice | `Already minted` |

Run automated negatives by extending `test/RwaFullFlow.test.js` with `expect(...).to.be.revertedWith(...)`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Contract code exceeds 24576 bytes` | Set `allowUnlimitedContractSize: true` on `hardhat` network |
| Compile errors on OZ v5 | Pin `@openzeppelin/contracts@4.9.6` |
| `Missing issuer claim` | Ensure the issuer wallet has an ONCHAINID identity with claim topic `7` issued by the configured `ClaimIssuer` (the `yarn issue-claims` script does this for account `#0`). |
| Machine registration fails | Approve **MachineNft** contract, not treasury |
| Transfer fails | `registerIdentity` + fee token approve on **fee module** |
| SE-2 deploy script not found | File must live in `packages/hardhat/deploy/` with `.ts` extension |
| `demo:flow` connection refused | Start `npx hardhat node` first |

---

## File reference (this repo)

| File | Purpose |
|------|---------|
| `test/RwaFullFlow.test.js` | Automated subset (Hardhat) |
| `scripts/fullFlowDemo.js` | Full flow on localhost (no SDK) |
| `scripts/lib/claims.js` | Claim payload + signing helpers |
| `scripts/deploy.js` | Framework-only deploy |
| `scaffold-eth/deploy/01_deploy_rwa_framework.ts` | Drop-in SE-2 deploy script |
| `TEST_GUIDE.md` | peaq-doc-aligned guide (includes SDK track) |

---

## Recommended order

1. `npm test` in `.`
2. `npx hardhat node` + `npm run demo:flow`
3. Scaffold ETH setup (Option B) for UI exploration
4. Manual phase checklist above on burner wallets
5. External audit before production deploy
