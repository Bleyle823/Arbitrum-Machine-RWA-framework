// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IToken {
    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event ComplianceAdded(address indexed _compliance);
    event IdentityRegistryAdded(address indexed _identityRegistry);
    event Paused(address _userAddress);
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);
    event TokensFrozen(address indexed _userAddress, uint256 _amount);
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Unpaused(address _userAddress);
    event UpdatedTokenInformation(string indexed _newName, string indexed _newSymbol, uint8 _newDecimals, string _newVersion, address indexed _newOnchainID);

    function allowance(address owner, address spender) external view returns (uint256 out0);
    function approve(address spender, uint256 amount) external returns (bool out0);
    function balanceOf(address account) external view returns (uint256 out0);
    function batchBurn(address[] memory _userAddresses, uint256[] memory _amounts) external;
    function batchForcedTransfer(address[] memory _fromList, address[] memory _toList, uint256[] memory _amounts) external;
    function batchFreezePartialTokens(address[] memory _userAddresses, uint256[] memory _amounts) external;
    function batchMint(address[] memory _toList, uint256[] memory _amounts) external;
    function batchSetAddressFrozen(address[] memory _userAddresses, bool[] memory _freeze) external;
    function batchTransfer(address[] memory _toList, uint256[] memory _amounts) external;
    function batchUnfreezePartialTokens(address[] memory _userAddresses, uint256[] memory _amounts) external;
    function burn(address _userAddress, uint256 _amount) external;
    function compliance() external view returns (address out0);
    function decimals() external view returns (uint8 out0);
    function forcedTransfer(address _from, address _to, uint256 _amount) external returns (bool out0);
    function freezePartialTokens(address _userAddress, uint256 _amount) external;
    function getFrozenTokens(address _userAddress) external view returns (uint256 out0);
    function identityRegistry() external view returns (address out0);
    function isFrozen(address _userAddress) external view returns (bool out0);
    function mint(address _to, uint256 _amount) external;
    function name() external view returns (string memory out0);
    function onchainID() external view returns (address out0);
    function pause() external;
    function paused() external view returns (bool out0);
    function recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID) external returns (bool out0);
    function setAddressFrozen(address _userAddress, bool _freeze) external;
    function setCompliance(address _compliance) external;
    function setRewardDistributor(address _distributor) external;
    function rewardDistributor() external view returns (address out0);
    function setIdentityRegistry(address _identityRegistry) external;
    function setName(string memory _name) external;
    function setOnchainID(address _onchainID) external;
    function setSymbol(string memory _symbol) external;
    function symbol() external view returns (string memory out0);
    function totalSupply() external view returns (uint256 out0);
    function transfer(address to, uint256 amount) external returns (bool out0);
    function transferFrom(address from, address to, uint256 amount) external returns (bool out0);
    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;
    function unpause() external;
    function version() external view returns (string memory out0);
}
