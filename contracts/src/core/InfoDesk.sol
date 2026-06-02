// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";
import {RwaConstants} from "./RwaConstants.sol";

/// @title InfoDesk — central configuration registry for fees, implementations, and treasury accounts
/// @notice Chain-agnostic config hub (Arbitrum, peaq, etc.); fee token is any ERC-20 (e.g. USDC on Arbitrum)
contract InfoDesk is IInfoDesk, Ownable {
    mapping(uint8 => address) private _implementations;
    mapping(uint8 => address) private _contracts;
    mapping(uint8 => address) private _accounts;
    mapping(uint8 => address) private _precompiles;
    mapping(uint8 => uint256) private _values;

    bool private _initialized;

    constructor(address owner_) {
        _transferOwnership(owner_);
        _values[RwaConstants.VAL_MACHINE_FEE_BPS] = 10_000; // 100% of machine value
        _values[RwaConstants.VAL_TX_FEE_BPS] = 100; // 1% transfer fee
        _values[RwaConstants.VAL_MAX_DID_BYTES] = RwaConstants.MAX_DID_BYTES;
        _values[RwaConstants.VAL_DID_METHOD] = RwaConstants.DID_METHOD_ARBITRUM;
    }

    function InfoDesk_init(address owner_) external override {
        require(!_initialized, "Already initialized");
        _initialized = true;
        _transferOwnership(owner_);
    }

    function setImplementation(uint8 implementationType, address newImplementation) external override onlyOwner {
        emit ImplementationUpdated(implementationType, _implementations[implementationType], newImplementation);
        _implementations[implementationType] = newImplementation;
    }

    function getImplementation(uint8 implementationType) external view override returns (address) {
        return _implementations[implementationType];
    }

    function setContract(uint8 contractType, address newAddress) external override onlyOwner {
        emit ContractUpdated(contractType, _contracts[contractType], newAddress);
        _contracts[contractType] = newAddress;
    }

    function getContract(uint8 contractType) external view override returns (address) {
        return _contracts[contractType];
    }

    function setAccount(uint8 accountType, address newAccount) external override onlyOwner {
        _accounts[accountType] = newAccount;
    }

    function getAccount(uint8 accountType) external view override returns (address) {
        return _accounts[accountType];
    }

    function setPrecompile(uint8 precompileType, address newAddress) external override onlyOwner {
        emit PrecompileUpdated(precompileType, _precompiles[precompileType], newAddress);
        _precompiles[precompileType] = newAddress;
    }

    function getPrecompile(uint8 precompileType) external view override returns (address) {
        return _precompiles[precompileType];
    }

    function setValue(uint8 valueType, uint256 newValue) external override onlyOwner {
        _values[valueType] = newValue;
    }

    function getValue(uint8 valueType) external view override returns (uint256) {
        return _values[valueType];
    }

    function computeMachineRegistrationFee(uint256 machineValue) external view override returns (uint256) {
        return (machineValue * _values[RwaConstants.VAL_MACHINE_FEE_BPS]) / 10_000;
    }

    function computeTransactionFee(uint256 amount) external view override returns (uint256) {
        return (amount * _values[RwaConstants.VAL_TX_FEE_BPS]) / 10_000;
    }

    function resetToDefaults() external override onlyOwner {
        _values[RwaConstants.VAL_MACHINE_FEE_BPS] = 10_000;
        _values[RwaConstants.VAL_TX_FEE_BPS] = 100;
        _values[RwaConstants.VAL_MAX_DID_BYTES] = RwaConstants.MAX_DID_BYTES;
        _values[RwaConstants.VAL_DID_METHOD] = RwaConstants.DID_METHOD_ARBITRUM;
    }
}
