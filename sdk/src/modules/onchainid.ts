import { Contract, ZeroAddress, getAddress, type Provider, type Signer } from "ethers";
import type { NetworkAddresses } from "../types/core.js";
import type {
  AddClaimToIdentity,
  CreateIdentity,
  CreateIdentityResult,
  GetIdentity,
  GetIdentityResult,
  IsVerified,
  IsVerifiedResult,
} from "../types/onchainid.js";
import { identityRegistryExtendedAbi } from "../abis.js";
import { addClaim } from "../claims.js";
import { SDKError } from "../errors/errors.js";
import { parseOptions, validators } from "../utils/helpers.js";
import { waitForTx } from "../utils/txs.js";

const idFactoryAbi = [
  "function getIdentity(address subject) view returns (address)",
  "function createIdentity(address subject, string salt) returns (address)",
];

export class OnChainID {
  constructor(
    private readonly addresses: NetworkAddresses,
    private readonly provider: Provider,
  ) {}

  private _idFactory(runner: Signer | Provider) {
    return new Contract(this.addresses.onchainid.idFactory, idFactoryAbi, runner);
  }

  private _identityRegistry(runner: Signer | Provider) {
    return new Contract(
      this.addresses.vault.identityRegistry,
      identityRegistryExtendedAbi,
      runner,
    );
  }

  async getIdentity(opts: GetIdentity): Promise<GetIdentityResult> {
    const { subject } = parseOptions<GetIdentity>(
      opts,
      { subject: { required: true, validator: validators.address, expected: "EVM address" } },
      "getIdentity",
    );

    const existing = await this._idFactory(this.provider).getIdentity(subject);
    if (existing && existing !== ZeroAddress) {
      return { status: "found", identity: getAddress(existing) };
    }
    return { status: "not_found" };
  }

  async createIdentity(opts: CreateIdentity): Promise<CreateIdentityResult> {
    const { idFactoryAdmin, subject, deploymentSalt } = parseOptions<CreateIdentity>(
      opts,
      {
        idFactoryAdmin: { required: true, validator: validators.signerWithProvider },
        subject: { required: true, validator: validators.address },
        deploymentSalt: { required: true, validator: validators.nonEmptyString },
      },
      "createIdentity",
    );

    const idFactory = this._idFactory(idFactoryAdmin);
    const existing = await idFactory.getIdentity(subject);
    if (existing && existing !== ZeroAddress) {
      return { status: "exists", identity: getAddress(existing) };
    }

    try {
      await idFactory.createIdentity.staticCall(subject, deploymentSalt);
    } catch (cause) {
      throw new SDKError("SIMULATE/CREATE_IDENTITY", "IdFactory createIdentity would revert", {
        cause,
      });
    }

    const tx = await idFactory.createIdentity.populateTransaction(subject, deploymentSalt);
    const receipt = await waitForTx(idFactoryAdmin, tx);
    const identity = getAddress(await idFactory.getIdentity(subject));
    return { status: "created", identity, receipt };
  }

  async isVerified(opts: IsVerified): Promise<IsVerifiedResult> {
    const { wallet } = parseOptions<IsVerified>(
      opts,
      { wallet: { required: true, validator: validators.address } },
      "isVerified",
    );
    const verified = await this._identityRegistry(this.provider).isVerified(wallet);
    return { verified: Boolean(verified), wallet: getAddress(wallet) };
  }

  async addClaimToIdentity(opts: AddClaimToIdentity): Promise<{ status: "added" | "skipped" }> {
    const parsed = parseOptions<AddClaimToIdentity>(
      opts,
      {
        identityOwner: { required: true, validator: validators.signerWithProvider },
        identityAddress: { required: true, validator: validators.address },
        claimIssuer: { required: true, validator: validators.signerWithProvider },
        claimIssuerAddress: { required: true, validator: validators.address },
        topic: { required: true },
        data: { required: true, validator: validators.string },
      },
      "addClaimToIdentity",
    );

    await addClaim(
      parsed.identityOwner,
      parsed.identityAddress,
      parsed.claimIssuer,
      parsed.claimIssuerAddress,
      parsed.topic,
      parsed.data,
      this.provider,
    );
    return { status: "added" };
  }
}
