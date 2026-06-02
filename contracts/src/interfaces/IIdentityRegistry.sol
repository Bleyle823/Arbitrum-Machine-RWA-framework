// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IIdentityRegistry {
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    event IdentityRegistered(address indexed investorAddress, address indexed identity);
    event IdentityRemoved(address indexed investorAddress, address indexed identity);
    event IdentityStorageSet(address indexed identityStorage);
    event IdentityUpdated(address indexed oldIdentity, address indexed newIdentity);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);

    function batchRegisterIdentity(address[] memory _userAddresses, address[] memory _identities, uint16[] memory _countries) external;
    function contains(address _userAddress) external view returns (bool out0);
    function deleteIdentity(address _userAddress) external;
    function identity(address _userAddress) external view returns (address out0);
    function identityStorage() external view returns (address out0);
    function investorCountry(address _userAddress) external view returns (uint16 out0);
    function isVerified(address _userAddress) external view returns (bool out0);
    function issuersRegistry() external view returns (address out0);
    function registerIdentity(address _userAddress, address _identity, uint16 _country) external;
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external;
    function setIdentityRegistryStorage(address _identityRegistryStorage) external;
    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external;
    function topicsRegistry() external view returns (address out0);
    function updateCountry(address _userAddress, uint16 _country) external;
    function updateIdentity(address _userAddress, address _identity) external;
}
