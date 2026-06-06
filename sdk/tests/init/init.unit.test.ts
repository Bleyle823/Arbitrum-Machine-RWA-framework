import { describe, it, expect, vi, beforeEach } from "vitest";
import { Chain } from "../../src/enums/core.js";

const ctorCalls = {
  vault: [] as unknown[][],
  mnft: [] as unknown[][],
  cnft: [] as unknown[][],
  onchainid: [] as unknown[][],
  rwanft: [] as unknown[][],
};

const getAddressesMock = vi.fn();
vi.mock("../../src/config/addresses.js", () => ({
  getAddresses: (...args: unknown[]) => getAddressesMock(...args),
}));

vi.mock("../../src/modules/vault.js", () => ({
  Vault: class Vault {
    constructor(...args: unknown[]) {
      ctorCalls.vault.push(args);
    }
  },
}));

vi.mock("../../src/modules/mnft.js", () => ({
  MachineNft: class MachineNft {
    constructor(...args: unknown[]) {
      ctorCalls.mnft.push(args);
    }
  },
}));

vi.mock("../../src/modules/cnft.js", () => ({
  ContractNft: class ContractNft {
    constructor(...args: unknown[]) {
      ctorCalls.cnft.push(args);
    }
  },
}));

vi.mock("../../src/modules/onchainid.js", () => ({
  OnChainID: class OnChainID {
    constructor(...args: unknown[]) {
      ctorCalls.onchainid.push(args);
    }
  },
}));

vi.mock("../../src/modules/rwanft.js", () => ({
  ArbRwaNft: class ArbRwaNft {
    constructor(...args: unknown[]) {
      ctorCalls.rwanft.push(args);
    }
  },
}));

describe("RWA SDK initialization (unit)", () => {
  beforeEach(() => {
    getAddressesMock.mockReset();
    for (const key of Object.keys(ctorCalls) as (keyof typeof ctorCalls)[]) {
      ctorCalls[key].length = 0;
    }
  });

  it("wires chainId, provider, addresses, and module constructors", async () => {
    const providerA = { tag: "providerA" } as never;
    const addressesA = { tag: "addressesA" } as never;
    getAddressesMock.mockReturnValue(addressesA);

    const { RWA } = await import("../../src/rwa.js");
    const sdk = new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider: providerA });

    expect(getAddressesMock).toHaveBeenCalledTimes(1);
    expect(getAddressesMock).toHaveBeenCalledWith(Chain.ARBITRUM_SEPOLIA, undefined);

    expect(sdk.chainId).toBe(Chain.ARBITRUM_SEPOLIA);
    expect(sdk.provider).toBe(providerA);
    expect(sdk.addresses).toBe(addressesA);

    expect(ctorCalls.vault).toEqual([[addressesA, providerA]]);
    expect(ctorCalls.mnft).toEqual([[addressesA, providerA]]);
    expect(ctorCalls.cnft).toEqual([[addressesA, providerA]]);
    expect(ctorCalls.onchainid).toEqual([[addressesA, providerA]]);
    expect(ctorCalls.rwanft).toEqual([[addressesA, providerA]]);
  });

  it("passes custom manifest override to getAddresses", async () => {
    const provider = { tag: "provider" } as never;
    const customManifest = { chainId: 421614 } as never;
    const addresses = { tag: "addresses" } as never;
    getAddressesMock.mockReturnValue(addresses);

    const { RWA } = await import("../../src/rwa.js");
    new RWA({ chainId: Chain.ARBITRUM_SEPOLIA, provider, manifest: customManifest });

    expect(getAddressesMock).toHaveBeenCalledWith(Chain.ARBITRUM_SEPOLIA, customManifest);
  });
});
