import { Contract, getAddress, type Provider, type Signer } from "ethers";
import type { NetworkAddresses } from "../types/core.js";
import type {
  ComputeContractId,
  ComputeContractIdResult,
  CreateContract,
  CreateContractResult,
  GetContractOwner,
  GetContractOwnerResult,
  SignContract,
  SignContractResult,
} from "../types/cnft.js";
import { contractNftExtendedAbi } from "../abis.js";
import { computeContractId } from "../contractId.js";
import { SDKError } from "../errors/errors.js";
import { parseOptions, validators } from "../utils/helpers.js";
import { waitForTx } from "../utils/txs.js";

export class ContractNft {
  constructor(
    private readonly addresses: NetworkAddresses,
    private readonly provider: Provider,
  ) {}

  private _contractNft(runner: Signer | Provider, address?: string) {
    return new Contract(address ?? this.addresses.nft.contractNft, contractNftExtendedAbi, runner);
  }

  computeContractId(opts: ComputeContractId): ComputeContractIdResult {
    const { initiator, counterparties, hashDigest, url } = parseOptions<ComputeContractId>(
      opts,
      {
        initiator: { required: true, validator: validators.address },
        counterparties: { required: true, validator: validators.arrayOf(validators.address) },
        hashDigest: { required: true },
        url: { required: true, validator: validators.nonEmptyString },
      },
      "computeContractId",
    );

    const contractId = computeContractId(
      getAddress(initiator) as `0x${string}`,
      counterparties.map(c => getAddress(c) as `0x${string}`),
      hashDigest,
      url,
    );
    return { contractId };
  }

  async getContractOwner(opts: GetContractOwner): Promise<GetContractOwnerResult> {
    const contractId = BigInt(opts.contractId);
    const owner = getAddress(await this._contractNft(this.provider).ownerOf(contractId));
    return { contractId, owner };
  }

  async createContract(opts: CreateContract): Promise<CreateContractResult> {
    const { initiator, counterparties, hashDigest, url } = parseOptions<CreateContract>(
      opts,
      {
        initiator: { required: true, validator: validators.signerWithProvider },
        counterparties: { required: true, validator: validators.arrayOf(validators.address) },
        hashDigest: { required: true },
        url: { required: true, validator: validators.nonEmptyString },
      },
      "createContract",
    );

    const cnft = this._contractNft(initiator);
    try {
      await cnft.initContractAndSign.staticCall(counterparties, hashDigest, url);
    } catch (cause) {
      throw new SDKError("SIMULATE/INIT_CONTRACT", "initContractAndSign would revert", { cause });
    }

    const tx = await cnft.initContractAndSign.populateTransaction(counterparties, hashDigest, url);
    const receipt = await waitForTx(initiator, tx);
    const { contractId } = this.computeContractId({
      initiator: await initiator.getAddress(),
      counterparties,
      hashDigest,
      url,
    });
    return { status: "created", contractId, receipt };
  }

  async signContract(opts: SignContract): Promise<SignContractResult> {
    const { signer, contractId } = parseOptions<SignContract>(
      opts,
      {
        signer: { required: true, validator: validators.signerWithProvider },
        contractId: { required: true },
      },
      "signContract",
    );

    const cnft = this._contractNft(signer);
    const id = BigInt(contractId);
    try {
      await cnft.signContract.staticCall(id);
    } catch (cause) {
      throw new SDKError("SIMULATE/SIGN_CONTRACT", "signContract would revert", { cause });
    }

    const tx = await cnft.signContract.populateTransaction(id);
    const receipt = await waitForTx(signer, tx);
    return { status: "signed", contractId: id, receipt };
  }
}
