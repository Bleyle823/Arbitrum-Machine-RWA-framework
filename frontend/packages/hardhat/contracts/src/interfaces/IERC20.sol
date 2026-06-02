// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function allowance(address owner, address spender) external view returns (uint256 out0);
    function approve(address spender, uint256 amount) external returns (bool out0);
    function balanceOf(address account) external view returns (uint256 out0);
    function totalSupply() external view returns (uint256 out0);
    function transfer(address to, uint256 amount) external returns (bool out0);
    function transferFrom(address from, address to, uint256 amount) external returns (bool out0);
}
