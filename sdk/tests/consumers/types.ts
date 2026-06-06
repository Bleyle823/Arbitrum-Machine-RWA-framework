// tests/consumers/types.ts — compile-time checks against built .d.ts

import type { SDKInit, NetworkAddresses, CreateIdentity, GetIdentityResult, Chain } from "../../dist/index";
import type { Signer } from "ethers";

type Expect<T extends true> = T;
type HasKeys<T, K extends PropertyKey> = Exclude<K, keyof T> extends never ? true : false;

type _SDKInit = Expect<HasKeys<SDKInit, "chainId" | "provider">>;
type _Addresses = Expect<HasKeys<NetworkAddresses, "onchainid" | "nft" | "vault" | "manifest">>;
type _CreateIdentity = Expect<HasKeys<CreateIdentity, "idFactoryAdmin" | "subject" | "deploymentSalt">>;
type _GetIdentityResult = Expect<HasKeys<GetIdentityResult, "status">>;
type _Chain = Expect<HasKeys<typeof Chain, "ARBITRUM_SEPOLIA" | "ARBITRUM_ONE">>;

export const okTypes: true = true;
