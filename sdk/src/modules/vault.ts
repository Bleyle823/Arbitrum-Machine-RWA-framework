import { Contract, getAddress, parseUnits, type Provider, type Signer } from "ethers";
import type { NetworkAddresses } from "../types/core.js";
import type {
  ClaimYield,
  ClaimYieldTo,
  DepositAndMint,
  DepositAndMintResult,
  DepositYield,
  EnsureTransferFeeAllowance,
  NftApproval,
  NftApprovalResult,
  Transfer,
  TransferResult,
} from "../types/vault.js";
import {
  arbVaultExtendedAbi,
  mockFeeTokenExtendedAbi,
  rewardDistributorExtendedAbi,
  tokenExtendedAbi,
  machineNftExtendedAbi,
  contractNftExtendedAbi,
} from "../abis.js";
import { DEFAULT_TRANSFER_FEE_ALLOWANCE, DEFAULT_VAULT_MINT_AMOUNT } from "../constants.js";
import { SDKError } from "../errors/errors.js";
import { parseOptions, validators } from "../utils/helpers.js";
import { waitForTx } from "../utils/txs.js";

export class Vault {
  constructor(
    private readonly addresses: NetworkAddresses,
    private readonly provider: Provider,
  ) {}

  private _vault(runner: Signer | Provider, address?: string) {
    return new Contract(address ?? this.addresses.vault.arbVault, arbVaultExtendedAbi, runner);
  }

  private _token(runner: Signer | Provider, address?: string) {
    return new Contract(address ?? this.addresses.vault.token, tokenExtendedAbi, runner);
  }

  private _feeToken(runner: Signer | Provider) {
    return new Contract(this.addresses.vault.feeToken, mockFeeTokenExtendedAbi, runner);
  }

  private _reward(runner: Signer | Provider) {
    return new Contract(this.addresses.vault.rewardDistributor, rewardDistributorExtendedAbi, runner);
  }

  async isMinted(vault?: string): Promise<boolean> {
    return this._vault(this.provider, vault).minted();
  }

  async tokenBalance(account: string, token?: string): Promise<bigint> {
    return this._token(this.provider, token).balanceOf(getAddress(account));
  }

  async transactionFee(transferAmount: bigint, vault?: string): Promise<{ fee: bigint; account: string }> {
    const [fee, account] = await this._vault(this.provider, vault).transactionFeeAndAccount(transferAmount);
    return { fee: BigInt(fee), account: getAddress(account) };
  }

  async nftApproval(opts: NftApproval): Promise<NftApprovalResult> {
    const { owner, nft, vault, tokenIds } = parseOptions<NftApproval>(
      opts,
      {
        owner: { required: true, validator: validators.signerWithProvider },
        nft: { required: true, validator: validators.address },
        vault: { required: true, validator: validators.address },
        tokenIds: { required: true, validator: validators.arrayOf(validators.string) },
      },
      "nftApproval",
    );

    const tokenIdsBigInt = tokenIds.map(id => BigInt(id));
    const isMachine = getAddress(nft) === getAddress(this.addresses.nft.machineNft);
    const abi = isMachine ? machineNftExtendedAbi : contractNftExtendedAbi;
    const nftContract = new Contract(nft, abi, owner);
    const receipts: unknown[] = [];

    for (const tokenId of tokenIdsBigInt) {
      try {
        await nftContract.approve.staticCall(vault, tokenId);
      } catch (cause) {
        throw new SDKError("SIMULATE/NFT_APPROVAL", "NFT approve would revert", { cause });
      }
      const tx = await nftContract.approve.populateTransaction(vault, tokenId);
      receipts.push(await waitForTx(owner, tx));
    }

    return { status: "approved", nft: getAddress(nft), vault: getAddress(vault), tokenIds: tokenIdsBigInt, receipts };
  }

  async depositAndMint(opts: DepositAndMint): Promise<DepositAndMintResult> {
    const vaultAddr = opts.vault ?? this.addresses.vault.arbVault;
    const rwaNfts = opts.rwaNfts ?? [this.addresses.nft.machineNft, this.addresses.nft.contractNft];
    const { vaultController, tokenIds, amount } = parseOptions<DepositAndMint>(
      { ...opts, vault: vaultAddr, rwaNfts },
      {
        vaultController: { required: true, validator: validators.signerWithProvider },
        vault: { required: true, validator: validators.address },
        rwaNfts: { required: true, validator: validators.arrayOf(validators.address) },
        tokenIds: { required: true, validator: validators.arrayOf(validators.string) },
        amount: { required: true },
      },
      "depositAndMint",
    );

    const tokenIdsBigInt = tokenIds.map(id => BigInt(id));
    const mintAmount = BigInt(amount);
    const vaultContract = this._vault(vaultController, vaultAddr);

    try {
      await vaultContract.depositAndMint.staticCall(rwaNfts, tokenIdsBigInt, mintAmount);
    } catch (cause) {
      throw new SDKError("SIMULATE/DEPOSIT_AND_MINT", "depositAndMint would revert", { cause });
    }

    const tx = await vaultContract.depositAndMint.populateTransaction(rwaNfts, tokenIdsBigInt, mintAmount);
    const receipt = await waitForTx(vaultController, tx);
    return {
      status: "deposited_and_minted",
      vault: getAddress(vaultAddr),
      tokenIds: tokenIdsBigInt,
      amount: mintAmount,
      receipt,
    };
  }

  async ensureTransferFeeAllowance(opts: EnsureTransferFeeAllowance): Promise<{ status: string; allowance: bigint }> {
    const parsed = parseOptions(
      opts,
      {
        allowanceSigner: { required: true, validator: validators.signerWithProvider },
        transferAmount: { required: true },
        allowance: { required: false },
      },
      "ensureTransferFeeAllowance",
    );
    const allowanceSigner = parsed.allowanceSigner as unknown as Signer;
    const transferAmount = BigInt(parsed.transferAmount as bigint);
    const allowance = BigInt((parsed.allowance as bigint | undefined) ?? DEFAULT_TRANSFER_FEE_ALLOWANCE);

    const { account } = await this.transactionFee(transferAmount);
    const feeToken = this._feeToken(allowanceSigner);
    const tx = await feeToken.approve.populateTransaction(account, allowance);
    await waitForTx(allowanceSigner, tx);
    return { status: "approved", allowance };
  }

  async transfer(opts: Transfer): Promise<TransferResult> {
    const tokenAddr = opts.token ?? this.addresses.vault.token;
    const { from, to, amount } = parseOptions<Transfer>(
      { ...opts, token: tokenAddr },
      {
        from: { required: true, validator: validators.signerWithProvider },
        token: { required: true, validator: validators.address },
        to: { required: true, validator: validators.address },
        amount: { required: true },
      },
      "transfer",
    );

    const token = this._token(from, tokenAddr);
    const amt = BigInt(amount);
    try {
      await token.transfer.staticCall(getAddress(to), amt);
    } catch (cause) {
      throw new SDKError("SIMULATE/TRANSFER_TOKENS", "token transfer would revert", { cause });
    }

    const tx = await token.transfer.populateTransaction(getAddress(to), amt);
    const receipt = await waitForTx(from, tx);
    return { status: "transferred", to: getAddress(to), amount: amt, receipt };
  }

  async depositYield(opts: DepositYield): Promise<{ status: string; receipt: unknown }> {
    const parsed = parseOptions(
      opts,
      {
        depositor: { required: true, validator: validators.signerWithProvider },
        amount: { required: true },
        vault: { required: false },
      },
      "depositYield",
    );
    const depositor = parsed.depositor as unknown as Signer;
    const amt = BigInt(parsed.amount as bigint);

    const feeToken = this._feeToken(depositor);
    const reward = this._reward(depositor);

    await waitForTx(
      depositor,
      await feeToken.approve.populateTransaction(this.addresses.vault.rewardDistributor, amt),
    );

    try {
      await reward.depositYield.staticCall(amt);
    } catch (cause) {
      throw new SDKError("SIMULATE/DEPOSIT_YIELD", "depositYield would revert", { cause });
    }

    const receipt = await waitForTx(depositor, await reward.depositYield.populateTransaction(amt));
    return { status: "deposited", receipt };
  }

  async claimYield(opts: ClaimYield): Promise<{ status: string; receipt: unknown }> {
    const parsed = parseOptions(
      opts,
      {
        claimant: { required: true, validator: validators.signerWithProvider },
        vault: { required: false },
      },
      "claimYield",
    );
    const claimant = parsed.claimant as unknown as Signer;
    const reward = this._reward(claimant);

    try {
      await reward.claim.staticCall();
    } catch (cause) {
      throw new SDKError("SIMULATE/CLAIM_YIELD", "claim would revert", { cause });
    }

    const receipt = await waitForTx(claimant, await reward.claim.populateTransaction());
    return { status: "claimed", receipt };
  }

  async claimYieldTo(opts: ClaimYieldTo): Promise<{ status: string; receipt: unknown }> {
    const parsed = parseOptions(
      opts,
      {
        claimant: { required: true, validator: validators.signerWithProvider },
        to: { required: true, validator: validators.address },
        vault: { required: false },
      },
      "claimYieldTo",
    );
    const claimant = parsed.claimant as unknown as Signer;
    const dest = getAddress(parsed.to as unknown as string);
    const reward = this._reward(claimant);

    try {
      await reward.claimTo.staticCall(dest);
    } catch (cause) {
      throw new SDKError("SIMULATE/CLAIM_YIELD_TO", "claimTo would revert", { cause });
    }

    const receipt = await waitForTx(claimant, await reward.claimTo.populateTransaction(dest));
    return { status: "claimed_to", receipt };
  }

  /** Demo default: 100 security tokens (18 decimals). */
  defaultMintAmount(): bigint {
    return DEFAULT_VAULT_MINT_AMOUNT;
  }

  /** Parse human-readable token amount (18 decimals). */
  parseTokenAmount(human: string): bigint {
    return parseUnits(human, 18);
  }
}
