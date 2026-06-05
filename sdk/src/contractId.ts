import { type Address, encodeAbiParameters, keccak256 } from "viem";

/** Matches Solidity: uint256(keccak256(abi.encode(initiator, counterparties, hashDigest, url))) */
export function computeContractId(
  initiator: Address,
  counterparties: Address[],
  hashDigest: bigint,
  url: string,
): bigint {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "address[]" }, { type: "uint256" }, { type: "string" }],
    [initiator, counterparties, hashDigest, url],
  );
  return BigInt(keccak256(encoded));
}

export function hashDigestFromUtf8(label: string): bigint {
  return BigInt(keccak256(new TextEncoder().encode(label)));
}

export function hashDigestFromHex(hex: `0x${string}`): bigint {
  return BigInt(hex);
}

export function ipfsUrlFromCid(cid: string): string {
  return cid.startsWith("ipfs://") ? cid : `ipfs://${cid}`;
}

export function gatewayUrlForCid(cid: string, gatewayHost?: string): string | null {
  const clean = cid.replace(/^ipfs:\/\//, "");
  if (!gatewayHost) return null;
  const host = gatewayHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/ipfs/${clean}`;
}
