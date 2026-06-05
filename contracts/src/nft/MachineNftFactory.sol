// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {MachineNft} from "./MachineNft.sol";

/// @dev Standalone factory so ArbRwaNft stays under the EIP-170 24KB limit on L2.
contract MachineNftFactory {
    function deployMachineNft(
        string memory issuerDid,
        string memory regulatorDid,
        address issuerWallet,
        address infoDesk,
        address feeToken
    ) external returns (address) {
        return address(new MachineNft(issuerDid, regulatorDid, issuerWallet, infoDesk, feeToken));
    }
}
