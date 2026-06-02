// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IArbVaultFactory {
    event VaultCreated(address indexed vault, address indexed token, address indexed distributor);
    event VaultTokenPaused(address indexed vault, address indexed token);
    event VaultTokenUnpaused(address indexed vault, address indexed token);

    function createVault(address vaultTaker, string memory name, string memory symbol, address asset, address tokenIdentity, address[] memory claimIssuers, uint256[] memory claimTopics, address[] memory complianceModules) external returns (address vaultAddr, address tokenAddr, address distributorAddr);
    function isArbVault(address vault) external view returns (bool out0);
    function pauseVaultToken(address vault) external;
    function unpauseVaultToken(address vault) external;
}
