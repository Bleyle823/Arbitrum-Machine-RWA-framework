import { Contract, getAddress, type Provider, type Signer } from "ethers";
import type { NetworkAddresses } from "../types/core.js";
import type { GetMachineDid, GetMachineDidResult, RegisterMachine, RegisterMachineResult } from "../types/mnft.js";
import { machineNftExtendedAbi } from "../abis.js";
import { SDKError } from "../errors/errors.js";
import { parseOptions, validators } from "../utils/helpers.js";
import { waitForTx } from "../utils/txs.js";

export class MachineNft {
  constructor(
    private readonly addresses: NetworkAddresses,
    private readonly provider: Provider,
  ) {}

  private _machineNft(runner: Signer | Provider, address?: string) {
    return new Contract(address ?? this.addresses.nft.machineNft, machineNftExtendedAbi, runner);
  }

  async getMachineDid(opts: GetMachineDid): Promise<GetMachineDidResult> {
    const tokenId = BigInt(opts.tokenId);
    const didBytes: string = await this._machineNft(this.provider).getMachineDid(tokenId);
    const hex = didBytes.startsWith("0x") ? didBytes.slice(2) : didBytes;
    const did = Buffer.from(hex, "hex").toString("utf8");
    return { tokenId, did };
  }

  async ownerOf(tokenId: bigint): Promise<string> {
    const owner = await this._machineNft(this.provider).ownerOf(tokenId);
    return getAddress(owner);
  }

  async registerMachine(opts: RegisterMachine): Promise<RegisterMachineResult> {
    const { machineIssuer, machineOwner, machineValue, tokenId, did } = parseOptions<RegisterMachine>(
      opts,
      {
        machineIssuer: { required: true, validator: validators.signerWithProvider },
        machineOwner: { required: true, validator: validators.address },
        machineValue: { required: true },
        tokenId: { required: true },
        did: { required: true },
      },
      "registerMachine",
    );

    const nft = this._machineNft(machineIssuer);
    try {
      await nft.registerMachine.staticCall(machineOwner, machineValue, tokenId, did);
    } catch (cause) {
      throw new SDKError("SIMULATE/REGISTER_MACHINE", "registerMachine would revert", { cause });
    }

    const tx = await nft.registerMachine.populateTransaction(machineOwner, machineValue, tokenId, did);
    const receipt = await waitForTx(machineIssuer, tx);
    return { status: "registered", tokenId: BigInt(tokenId), receipt };
  }
}
