// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIdFactory} from "../interfaces/IIdFactory.sol";
import {RwaIdentity} from "./Identity.sol";

/// @title IdFactory — deploys ONCHAINID identities and links them to EOAs
contract IdFactory is IIdFactory, Ownable {
    address public override implementationAuthority;
    mapping(address => address) private _walletToIdentity;
    mapping(address => address) private _identityToToken;
    mapping(address => address[]) private _identityToWallets;
    mapping(string => bool) public override isSaltTaken;
    mapping(address => bool) private _tokenFactories;

    event IdentityCreated(address indexed wallet, address indexed identity, string salt);

    constructor(address owner_, address implementationAuthority_) {
        _transferOwnership(owner_);
        implementationAuthority = implementationAuthority_;
    }

    function createIdentity(address _wallet, string memory _salt) external override onlyOwner returns (address) {
        require(_walletToIdentity[_wallet] == address(0), "Wallet linked");
        require(!isSaltTaken[_salt], "Salt taken");
        isSaltTaken[_salt] = true;

        RwaIdentity identity = new RwaIdentity();
        identity.initialize(_wallet);

        address identityAddr = address(identity);
        _walletToIdentity[_wallet] = identityAddr;
        _identityToWallets[identityAddr].push(_wallet);

        emit IdentityCreated(_wallet, identityAddr, _salt);
        emit Deployed(identityAddr);
        emit WalletLinked(_wallet, identityAddr);
        return identityAddr;
    }

    function createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] memory _managementKeys)
        external
        override
        onlyOwner
        returns (address)
    {
        address identityAddr = this.createIdentity(_wallet, _salt);
        RwaIdentity id = RwaIdentity(identityAddr);
        for (uint256 i = 0; i < _managementKeys.length; i++) {
            id.addKey(_managementKeys[i], 1, 1);
        }
        return identityAddr;
    }

    function createTokenIdentity(address _token, address _tokenOwner, string memory _salt)
        external
        override
        returns (address)
    {
        require(_tokenFactories[msg.sender], "Not token factory");
        require(!isSaltTaken[_salt], "Salt taken");
        isSaltTaken[_salt] = true;

        RwaIdentity identity = new RwaIdentity();
        identity.initialize(_tokenOwner);
        address identityAddr = address(identity);
        _identityToToken[identityAddr] = _token;
        emit Deployed(identityAddr);
        emit TokenLinked(_token, identityAddr);
        return identityAddr;
    }

    function getIdentity(address _wallet) external view override returns (address) {
        return _walletToIdentity[_wallet];
    }

    function getToken(address _identity) external view override returns (address) {
        return _identityToToken[_identity];
    }

    function getWallets(address _identity) external view override returns (address[] memory) {
        return _identityToWallets[_identity];
    }

    function linkWallet(address _newWallet) external override {
        address identityAddr = _walletToIdentity[msg.sender];
        require(identityAddr != address(0), "No identity");
        require(_walletToIdentity[_newWallet] == address(0), "Wallet taken");
        _walletToIdentity[_newWallet] = identityAddr;
        _identityToWallets[identityAddr].push(_newWallet);
        emit WalletLinked(_newWallet, identityAddr);
    }

    function unlinkWallet(address _oldWallet) external override {
        address identityAddr = _walletToIdentity[msg.sender];
        require(identityAddr != address(0), "No identity");
        require(_walletToIdentity[_oldWallet] == identityAddr, "Not linked");
        delete _walletToIdentity[_oldWallet];
        emit WalletUnlinked(_oldWallet, identityAddr);
    }

    function addTokenFactory(address _factory) external override onlyOwner {
        _tokenFactories[_factory] = true;
        emit TokenFactoryAdded(_factory);
    }

    function removeTokenFactory(address _factory) external override onlyOwner {
        _tokenFactories[_factory] = false;
        emit TokenFactoryRemoved(_factory);
    }

    function isTokenFactory(address _factory) external view override returns (bool) {
        return _tokenFactories[_factory];
    }
}
