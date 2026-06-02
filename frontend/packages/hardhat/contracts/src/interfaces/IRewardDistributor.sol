// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IRewardDistributor {
    event Claimed(address indexed account, address indexed to, uint256 indexed amount);
    event YieldDeposited(uint256 indexed amount, uint256 indexed deltaIndex, uint256 indexed newGlobalIndex);

    function accruedRewards(address account) external view returns (uint256 out0);
    function asset() external view returns (address out0);
    function claim() external;
    function claimTo(address to) external;
    function depositYield(uint256 amount) external;
    function globalIndex() external view returns (uint256 out0);
    function initialize(address token_, address asset_, address manager_) external;
    function manager() external view returns (address out0);
    function personalIndex(address account) external view returns (uint256 out0);
    function settleOnTransfer(address from, address to) external;
    function token() external view returns (address out0);
}
