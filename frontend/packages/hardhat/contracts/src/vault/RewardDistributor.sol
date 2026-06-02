// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRewardDistributor} from "../interfaces/IRewardDistributor.sol";
import {IToken} from "../vendor/erc3643/token/IToken.sol";

/// @title RewardDistributor — index-based yield distribution to security token holders
contract RewardDistributor is IRewardDistributor, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e18;

    address public override token;
    address public override asset;
    address public override manager;

    uint256 public override globalIndex;
    mapping(address => uint256) public override personalIndex;
    mapping(address => uint256) public override accruedRewards;

    bool private _initialized;

    function initialize(address token_, address asset_, address manager_) external override {
        require(!_initialized, "Initialized");
        _initialized = true;
        token = token_;
        asset = asset_;
        manager = manager_;
        _transferOwnership(manager_);
    }

    function depositYield(uint256 amount) external override {
        require(amount > 0, "Zero amount");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        uint256 supply = IToken(token).totalSupply();
        require(supply > 0, "No supply");

        globalIndex += (amount * PRECISION) / supply;
        emit YieldDeposited(amount, globalIndex, globalIndex);
    }

    function claim() external override {
        _settle(msg.sender);
        uint256 amount = accruedRewards[msg.sender];
        require(amount > 0, "Nothing to claim");
        accruedRewards[msg.sender] = 0;
        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, msg.sender, amount);
    }

    function claimTo(address to) external override {
        require(to != address(0), "Zero to");
        _settle(msg.sender);
        uint256 amount = accruedRewards[msg.sender];
        require(amount > 0, "Nothing to claim");
        accruedRewards[msg.sender] = 0;
        IERC20(asset).safeTransfer(to, amount);
        emit Claimed(msg.sender, to, amount);
    }

    function settleOnTransfer(address from, address to) external override {
        require(msg.sender == token, "Only token");
        if (from != address(0)) _settle(from);
        if (to != address(0)) _settle(to);
    }

    function _settle(address account) internal {
        uint256 balance = IToken(token).balanceOf(account);
        uint256 delta = globalIndex - personalIndex[account];
        if (delta > 0 && balance > 0) {
            accruedRewards[account] += (balance * delta) / PRECISION;
        }
        personalIndex[account] = globalIndex;
    }
}
