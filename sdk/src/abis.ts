import { type Abi } from "viem";

/** Extended ContractNft ABI (views + writes used by apps). */
export const contractNftExtendedAbi = [
  {
    type: "function",
    name: "computeContractId",
    inputs: [
      { name: "initiator", type: "address" },
      { name: "counterparties", type: "address[]" },
      { name: "hashDigest", type: "uint256" },
      { name: "url", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getContractIdsByInitiator",
    inputs: [{ name: "initiator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDraftStatus",
    inputs: [{ name: "contractId", type: "uint256" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "completed", type: "bool" },
      { name: "cancelled", type: "bool" },
      { name: "requiredSignatures", type: "uint256" },
      { name: "currentSignatures", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getContractDetails",
    inputs: [{ name: "contractId", type: "uint256" }],
    outputs: [
      { name: "initiator", type: "address" },
      { name: "counterparties", type: "address[]" },
      { name: "hashDigest", type: "uint256" },
      { name: "url", type: "string" },
      { name: "completed", type: "bool" },
      { name: "cancelled", type: "bool" },
      { name: "signatureCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initContractAndSign",
    inputs: [
      { name: "counterparties", type: "address[]" },
      { name: "hashDigest", type: "uint256" },
      { name: "url", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "signContract",
    inputs: [{ name: "contractId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setupFeeAndAccount",
    inputs: [],
    outputs: [
      { name: "fee", type: "uint256" },
      { name: "account", type: "address" },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const machineNftExtendedAbi = [
  {
    type: "function",
    name: "registerMachine",
    inputs: [
      { name: "machineOwner", type: "address" },
      { name: "machineValue", type: "uint256" },
      { name: "tokenId", type: "uint160" },
      { name: "did", type: "bytes" },
    ],
    outputs: [{ name: "", type: "uint160" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "registrationFeeAndAccount",
    inputs: [{ name: "machineValue", type: "uint256" }],
    outputs: [
      { name: "fee", type: "uint256" },
      { name: "account", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMachineDid",
    inputs: [{ name: "tokenId", type: "uint160" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const identityRegistryExtendedAbi = [
  {
    type: "function",
    name: "isVerified",
    inputs: [{ name: "_userAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const tokenRegistryExtendedAbi = [
  {
    type: "function",
    name: "identityRegistry",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const arbVaultExtendedAbi = [
  {
    type: "function",
    name: "minted",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "depositAndMint",
    inputs: [
      { name: "rwaNft", type: "address[]" },
      { name: "tokenIds", type: "uint256[]" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transactionFeeAndAccount",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [
      { name: "fee", type: "uint256" },
      { name: "account", type: "address" },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const tokenExtendedAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

export const rewardDistributorExtendedAbi = [
  {
    type: "function",
    name: "depositYield",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimTo",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

export const mockFeeTokenExtendedAbi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

/** All extended ABIs keyed by contract role. */
export const rwaExtendedAbis = {
  contractNft: contractNftExtendedAbi,
  machineNft: machineNftExtendedAbi,
  identityRegistry: identityRegistryExtendedAbi,
  tokenRegistry: tokenRegistryExtendedAbi,
  arbVault: arbVaultExtendedAbi,
  token: tokenExtendedAbi,
  rewardDistributor: rewardDistributorExtendedAbi,
  mockFeeToken: mockFeeTokenExtendedAbi,
} as const;
