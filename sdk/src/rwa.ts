import type { Provider } from "ethers";
import { getAddresses } from "./config/addresses.js";
import { OnChainID } from "./modules/onchainid.js";
import { ArbRwaNft } from "./modules/rwanft.js";
import { MachineNft } from "./modules/mnft.js";
import { ContractNft } from "./modules/cnft.js";
import { Vault } from "./modules/vault.js";
import type { SDKInit, NetworkAddresses } from "./types/core.js";

/**
 * Entry point for the Arbitrum Machine RWA SDK.
 *
 * Provides module-based access to ONCHAINID identities, Machine/Contract NFTs,
 * ArbRwaNft factory admin, and ERC-3643 vault operations on Arbitrum.
 */
export class RWA {
  readonly chainId: number;
  readonly addresses: NetworkAddresses;
  readonly provider: Provider;

  readonly onchainid: OnChainID;
  readonly rwanft: ArbRwaNft;
  readonly mnft: MachineNft;
  readonly cnft: ContractNft;
  readonly vault: Vault;

  constructor(opts: SDKInit) {
    this.chainId = opts.chainId;
    this.provider = opts.provider;
    this.addresses = getAddresses(opts.chainId, opts.manifest);

    this.onchainid = new OnChainID(this.addresses, this.provider);
    this.rwanft = new ArbRwaNft(this.addresses, this.provider);
    this.mnft = new MachineNft(this.addresses, this.provider);
    this.cnft = new ContractNft(this.addresses, this.provider);
    this.vault = new Vault(this.addresses, this.provider);
  }

  getAddresses(): NetworkAddresses {
    return this.addresses;
  }

  getManifest() {
    return this.addresses.manifest;
  }
}
