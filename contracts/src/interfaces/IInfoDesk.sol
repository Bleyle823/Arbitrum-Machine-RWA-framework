// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IInfoDesk {
    event ContractUpdated(uint8 contractType, address oldAddress, address newAddress);
    event ImplementationUpdated(uint8 implementationType, address oldAddress, address newAddress);
    event PrecompileUpdated(uint8 precompileType, address oldAddress, address newAddress);

    function InfoDesk_init(address owner) external;
    function computeMachineRegistrationFee(uint256 machineValue) external view returns (uint256 out0);
    function computeTransactionFee(uint256 amount) external view returns (uint256 out0);
    function getAccount(uint8 accountType) external view returns (address out0);
    function getContract(uint8 contractType) external view returns (address out0);
    function getImplementation(uint8 implementationType) external view returns (address out0);
    function getPrecompile(uint8 precompileType) external view returns (address out0);
    function getValue(uint8 valueType) external view returns (uint256 out0);
    function resetToDefaults() external;
    function setAccount(uint8 accountType, address newAccount) external;
    function setContract(uint8 contractType, address newAddress) external;
    function setImplementation(uint8 implementationType, address newImplementation) external;
    function setPrecompile(uint8 precompileType, address newAddress) external;
    function setValue(uint8 valueType, uint256 newValue) external;
}
