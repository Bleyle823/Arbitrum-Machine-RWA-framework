import type { Provider } from "ethers";
import type { Chain } from "../enums/core.js";
import type { RwaManifest } from "../manifest.js";

export type SDKInit = {
  chainId: Chain;
  provider: Provider;
  /** Override bundled manifest (e.g. after redeploy). */
  manifest?: RwaManifest;
};

export type NetworkAddresses = {
  manifest: RwaManifest;
  onchainid: {
    idFactory: string;
    claimIssuer: string;
  };
  nft: {
    arbRwaNft: string;
    machineNft: string;
    contractNft: string;
  };
  vault: {
    factory: string;
    arbVault: string;
    token: string;
    identityRegistry: string;
    rewardDistributor: string;
    feeModule: string;
    feeToken: string;
  };
};
