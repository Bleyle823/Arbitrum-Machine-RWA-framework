// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IArbRwaNft {
    event ContractNftAdded(address indexed contractNft);
    event MachineIssuerAdded(address indexed issuer, address indexed machineNft);
    event MachineIssuerRemoved(address indexed regulator, address indexed issuer);
    event MachineRegulatorAdded(address indexed regulator);
    event MachineRegulatorRemoved(address indexed regulator);

    function addContractNft() external;
    function addMachineIssuer(address issuer) external;
    function addMachineRegulator(address regulator) external;
    function findContractNft(uint256 contractId) external view returns (address out0);
    function getMachineIssuers() external view returns (address[] memory out0);
    function getMachineNftByIssuer(address issuer) external view returns (address out0);
    function getMachineRegulators() external view returns (address[] memory out0);
    function isContractNft(address addr) external view returns (bool out0);
    function isMachineNft(address addr) external view returns (bool out0);
    function isRwaNft(address addr) external view returns (bool out0);
    function removeMachineIssuer(address issuer) external;
    function removeMachineRegulator(address regulator) external;
    function setMachineNftBlockState(address issuerOrContractNft, bool blocked) external;
}
