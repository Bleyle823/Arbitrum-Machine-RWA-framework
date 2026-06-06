import { Contract, type Provider } from "ethers";
import type { NetworkAddresses } from "../types/core.js";

const arbRwaNftAbi = [
  "function addMachineIssuer(address issuer) external",
  "function removeMachineIssuer(address issuer) external",
  "function addMachineRegulator(address regulator) external",
  "function getMachineIssuers() view returns (address[])",
  "function getMachineRegulators() view returns (address[])",
];

/** Administrative operations on the ArbRwaNft factory contract. */
export class ArbRwaNft {
  constructor(
    private readonly addresses: NetworkAddresses,
    private readonly provider: Provider,
  ) {}

  private _factory(runner: Provider) {
    return new Contract(this.addresses.nft.arbRwaNft, arbRwaNftAbi, runner);
  }

  async getMachineIssuers(): Promise<string[]> {
    return this._factory(this.provider).getMachineIssuers();
  }

  async getMachineRegulators(): Promise<string[]> {
    return this._factory(this.provider).getMachineRegulators();
  }
}
