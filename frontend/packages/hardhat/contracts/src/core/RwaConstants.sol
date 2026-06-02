// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @title RwaConstants — shared enums and claim topics for the RWA framework
library RwaConstants {
    // Claim topics (compatible with peaq SDK ClaimTopics enum; used on any EVM chain)
    uint256 internal constant CT_KYC_APPROVED = 666;
    uint256 internal constant CT_MNFT_ISSUER = 7;
    uint256 internal constant CT_MNFT_REGULATOR = 8;

    // ECDSA claim scheme used by the SDK
    uint256 internal constant SCHEME_ECDSA = 1;

    // ONCHAINID key purposes
    uint256 internal constant KEY_PURPOSE_MANAGEMENT = 1;
    uint256 internal constant KEY_PURPOSE_CLAIM = 3;

    // ONCHAINID key types
    uint256 internal constant KEY_TYPE_ECDSA = 1;

    // InfoDesk implementation types (match SDK IDImplementationType)
    uint8 internal constant IMPL_ARB_VAULT = 0;
    uint8 internal constant IMPL_MACHINE_NFT = 1;
    uint8 internal constant IMPL_CONTRACT_NFT = 2;
    uint8 internal constant IMPL_REWARD_DISTRIBUTOR = 3;
    uint8 internal constant IMPL_NATIVE_TRANSFER_FEE = 4;

    // InfoDesk account types
    uint8 internal constant ACCT_FEE_TREASURY = 0;
    uint8 internal constant ACCT_MACHINE_FEE = 1;
    uint8 internal constant ACCT_CONTRACT_FEE = 2;

    // InfoDesk value types
    uint8 internal constant VAL_MACHINE_FEE_BPS = 0;
    uint8 internal constant VAL_TX_FEE_BPS = 1;
    uint8 internal constant VAL_MAX_DID_BYTES = 2;
    uint8 internal constant VAL_CONTRACT_SETUP_FEE = 3;
    /// @dev InfoDesk.getValue(VAL_DID_METHOD) — see DID_METHOD_* below
    uint8 internal constant VAL_DID_METHOD = 4;

    /// @dev Default on Arbitrum deployments: did:arbitrum:issuer:0x...
    uint256 internal constant DID_METHOD_ARBITRUM = 0;
    /// @dev Optional peaq interoperability: did:peaq:issuer:0x...
    uint256 internal constant DID_METHOD_PEAQ = 1;
    /// @dev Legacy generic prefix: did:rwa:issuer:0x...
    uint256 internal constant DID_METHOD_RWA = 2;

    // Max serialized DID blob (SDK enforces 2561 hex chars ≈ 1280 bytes)
    uint256 internal constant MAX_DID_BYTES = 1280;
}
