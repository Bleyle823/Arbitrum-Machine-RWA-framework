// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AbstractModule} from "../vendor/erc3643/compliance/modular/modules/AbstractModule.sol";
import {IInfoDesk} from "../core/InfoDesk.sol";
import {RwaConstants} from "../core/RwaConstants.sol";

/// @title NativeTransferFeeModule — T-REX modular compliance module (InfoDesk fee ERC-20)
contract NativeTransferFeeModule is AbstractModule {
    using SafeERC20 for IERC20;

    address public infoDesk;
    address public feeToken;

    uint8 internal constant FEE_TOKEN_TYPE = 0;

    function initialize(address infoDeskAddress) external {
        require(infoDesk == address(0), "Initialized");
        infoDesk = infoDeskAddress;
        feeToken = IInfoDesk(infoDeskAddress).getContract(FEE_TOKEN_TYPE);
    }

    function name() external pure override returns (string memory) {
        return "NativeTransferFeeModule";
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function canComplianceBind(address) external pure override returns (bool) {
        return true;
    }

    function moduleCheck(address from, address to, uint256 value, address)
        external
        view
        override
        returns (bool)
    {
        if (from == address(0) || to == address(0)) return true;
        uint256 fee = IInfoDesk(infoDesk).computeTransactionFee(value);
        if (fee == 0) return true;
        return IERC20(feeToken).allowance(from, address(this)) >= fee;
    }

    function moduleTransferAction(address from, address to, uint256 value) external override onlyComplianceCall {
        if (from == address(0) || to == address(0)) return;
        uint256 fee = IInfoDesk(infoDesk).computeTransactionFee(value);
        if (fee == 0) return;
        address treasury = IInfoDesk(infoDesk).getAccount(RwaConstants.ACCT_FEE_TREASURY);
        IERC20(feeToken).safeTransferFrom(from, treasury, fee);
    }

    function moduleMintAction(address, uint256) external pure override {}
    function moduleBurnAction(address, uint256) external pure override {}
}
