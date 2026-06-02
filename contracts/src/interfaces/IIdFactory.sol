// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IIdFactory {
    event Deployed(address indexed _addr);
    event TokenFactoryAdded(address indexed factory);
    event TokenFactoryRemoved(address indexed factory);
    event TokenLinked(address indexed token, address indexed identity);
    event WalletLinked(address indexed wallet, address indexed identity);
    event WalletUnlinked(address indexed wallet, address indexed identity);

    function addTokenFactory(address _factory) external;
    function createIdentity(address _wallet, string memory _salt) external returns (address out0);
    function createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] memory _managementKeys) external returns (address out0);
    function createTokenIdentity(address _token, address _tokenOwner, string memory _salt) external returns (address out0);
    function getIdentity(address _wallet) external view returns (address out0);
    function getToken(address _identity) external view returns (address out0);
    function getWallets(address _identity) external view returns (address[] memory out0);
    function implementationAuthority() external view returns (address out0);
    function isSaltTaken(string memory _salt) external view returns (bool out0);
    function isTokenFactory(address _factory) external view returns (bool out0);
    function linkWallet(address _newWallet) external;
    function removeTokenFactory(address _factory) external;
    function unlinkWallet(address _oldWallet) external;
}
