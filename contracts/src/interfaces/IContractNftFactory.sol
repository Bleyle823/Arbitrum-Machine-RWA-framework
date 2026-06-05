// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IContractNftFactory {
    function deployContractNft(address infoDesk, address feeToken, address rwaNftRegistry) external returns (address);
}
