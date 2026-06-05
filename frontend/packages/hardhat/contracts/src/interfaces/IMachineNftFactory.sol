// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IMachineNftFactory {
    function deployMachineNft(
        string memory issuerDid,
        string memory regulatorDid,
        address issuerWallet,
        address infoDesk,
        address feeToken
    ) external returns (address);
}
