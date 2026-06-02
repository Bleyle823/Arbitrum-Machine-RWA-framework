// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IIdentity as OnchainIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {RwaConstants} from "../core/RwaConstants.sol";

/// @title RwaIdentity — ONCHAINID-compatible identity contract with claim and key management
contract RwaIdentity is IIdentity {
    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
        bool revoked;
    }

    struct Key {
        uint256[] purposes;
        uint256 keyType;
        bytes32 key;
    }

    address public owner;
    mapping(bytes32 => Claim) private _claims;
    mapping(uint256 => bytes32[]) private _claimsByTopic;
    mapping(bytes32 => Key) private _keys;
    mapping(uint256 => bytes32[]) private _keysByPurpose;
    uint256 public executionNonce;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not identity owner");
        _;
    }

    modifier onlyManager() {
        require(_hasManagementKey(msg.sender), "Not manager");
        _;
    }

    function initialize(address initialOwner) external {
        require(owner == address(0), "Already initialized");
        owner = initialOwner;
        bytes32 key = bytes32(uint256(uint160(initialOwner)));
        _addKeyInternal(key, RwaConstants.KEY_PURPOSE_MANAGEMENT, RwaConstants.KEY_TYPE_ECDSA);
    }

    function addClaim(uint256 _topic, uint256 _scheme, address issuer, bytes memory _signature, bytes memory _data, string memory _uri)
        external
        override
        onlyManager
        returns (bytes32 claimRequestId)
    {
        require(_scheme == RwaConstants.SCHEME_ECDSA, "Unsupported scheme");
        require(
            IClaimIssuer(issuer).isClaimValid(OnchainIdentity(address(this)), _topic, _signature, _data),
            "Invalid claim signature"
        );

        // Claim id layout matches ERC-3643 IdentityRegistry.isVerified (keccak256(issuer, topic))
        claimRequestId = keccak256(abi.encode(issuer, _topic));
        require(_claims[claimRequestId].issuer == address(0), "Claim exists");

        _claims[claimRequestId] = Claim(_topic, _scheme, issuer, _signature, _data, _uri, false);
        _claimsByTopic[_topic].push(claimRequestId);
        emit ClaimAdded(claimRequestId, _topic, _scheme, issuer, _signature, _data, _uri);
    }

    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external override onlyManager returns (bool success) {
        _addKeyInternal(_key, _purpose, _keyType);
        return true;
    }

    function removeKey(bytes32 _key, uint256 _purpose) external override onlyManager returns (bool success) {
        Key storage k = _keys[_key];
        require(k.key != bytes32(0), "Unknown key");
        uint256 len = k.purposes.length;
        for (uint256 i = 0; i < len; i++) {
            if (k.purposes[i] == _purpose) {
                k.purposes[i] = k.purposes[len - 1];
                k.purposes.pop();
                break;
            }
        }
        emit KeyRemoved(_key, _purpose, k.keyType);
        return true;
    }

    function removeClaim(bytes32 _claimId) external override onlyManager returns (bool success) {
        Claim memory c = _claims[_claimId];
        require(c.issuer != address(0), "Unknown claim");
        _claims[_claimId].revoked = true;
        emit ClaimRemoved(_claimId, c.topic, c.scheme, c.issuer, c.signature, c.data, c.uri);
        return true;
    }

    function approve(uint256 _id, bool _approve) external override onlyManager returns (bool success) {
        emit Approved(_id, _approve);
        return true;
    }

    function execute(address _to, uint256 _value, bytes memory _data)
        external
        payable
        override
        onlyManager
        returns (uint256 executionId)
    {
        executionId = ++executionNonce;
        emit ExecutionRequested(executionId, _to, _value, _data);
        (bool ok,) = _to.call{value: _value}(_data);
        if (ok) emit Executed(executionId, _to, _value, _data);
        else emit ExecutionFailed(executionId, _to, _value, _data);
    }

    function getClaim(bytes32 _claimId)
        external
        view
        override
        returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri)
    {
        Claim memory c = _claims[_claimId];
        require(c.issuer != address(0) && !c.revoked, "Invalid claim");
        return (c.topic, c.scheme, c.issuer, c.signature, c.data, c.uri);
    }

    function getClaimIdsByTopic(uint256 _topic) external view override returns (bytes32[] memory claimIds) {
        return _claimsByTopic[_topic];
    }

    function getKey(bytes32 _key) external view override returns (uint256[] memory purposes, uint256 keyType, bytes32 key) {
        Key memory k = _keys[_key];
        return (k.purposes, k.keyType, k.key);
    }

    function getKeyPurposes(bytes32 _key) external view override returns (uint256[] memory _purposes) {
        return _keys[_key].purposes;
    }

    function getKeysByPurpose(uint256 _purpose) external view override returns (bytes32[] memory keys) {
        return _keysByPurpose[_purpose];
    }

    function keyHasPurpose(bytes32 _key, uint256 _purpose) external view override returns (bool exists) {
        uint256[] memory purposes = _keys[_key].purposes;
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == _purpose) return true;
        }
        return false;
    }

    function isClaimValid(address _identity, uint256 claimTopic, bytes memory sig, bytes memory data)
        external
        view
        override
        returns (bool)
    {
        bytes32 payload = keccak256(abi.encode(_identity, claimTopic, data));
        bytes32 digest = ECDSA.toEthSignedMessageHash(payload);
        address recovered = ECDSA.recover(digest, sig);
        return recovered != address(0);
    }

    function hasClaimTopic(uint256 topic) external view returns (bool) {
        bytes32[] memory ids = _claimsByTopic[topic];
        for (uint256 i = 0; i < ids.length; i++) {
            if (!_claims[ids[i]].revoked) return true;
        }
        return false;
    }

    function _addKeyInternal(bytes32 _key, uint256 _purpose, uint256 _keyType) internal {
        Key storage k = _keys[_key];
        if (k.key == bytes32(0)) {
            k.key = _key;
            k.keyType = _keyType;
        }
        if (!keyHasPurposeInternal(_key, _purpose)) {
            k.purposes.push(_purpose);
            _keysByPurpose[_purpose].push(_key);
            emit KeyAdded(_key, _purpose, _keyType);
        }
    }

    function keyHasPurposeInternal(bytes32 _key, uint256 _purpose) internal view returns (bool) {
        uint256[] memory purposes = _keys[_key].purposes;
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == _purpose) return true;
        }
        return false;
    }

    function _hasManagementKey(address account) internal view returns (bool) {
        if (account == owner) return true;
        bytes32 key = bytes32(uint256(uint160(account)));
        return keyHasPurposeInternal(key, RwaConstants.KEY_PURPOSE_MANAGEMENT);
    }
}
