// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IArbVault {
    event Burned(address indexed from, uint256 indexed amount);
    event Deposited(address indexed from, address indexed machineNft, uint256 indexed tokenId);
    event Minted(address indexed to, uint256 indexed amount);
    event TokenSet(address indexed token);
    event VaultTakerSet(address indexed vaultTaker);

    function configureKycRequirement(address[] memory claimIssuers, uint256[] memory claimTopics) external;
    function depositAndMint(address[] memory rwaNft, uint256[] memory tokenIds, uint256 amount) external;
    function burnAndRedeem(uint256 amount) external;
    function depositor() external view returns (address out0);
    function identityRegistry() external view returns (address out0);
    function minted() external view returns (bool out0);
    function nfts() external view returns (bytes[] memory out0);
    function redeemed() external view returns (bool out0);
    function rewardDistributor() external view returns (address out0);
    function setRewardDistributor(address distributor) external;
    function setToken(address token_) external;
    function setVaultTaker(address vaultTaker) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool out0);
    function token() external view returns (address out0);
    function transactionFeeAndAccount(uint256 amount) external view returns (uint256 fee, address account);
}
