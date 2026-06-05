// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ContractNft} from "./ContractNft.sol";

/// @dev Standalone factory so ArbRwaNft stays under the EIP-170 24KB limit on L2.
contract ContractNftFactory {
    function deployContractNft(address infoDesk, address feeToken, address rwaNftRegistry)
        external
        returns (address)
    {
        return address(new ContractNft(infoDesk, feeToken, rwaNftRegistry));
    }
}
