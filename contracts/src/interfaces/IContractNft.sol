// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IContractNft {
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ContractCancelled(uint256 indexed contractId);
    event ContractCompleted(uint256 indexed contractId, address indexed signer);
    event ContractInitiated(uint256 indexed contractId, address indexed initiator);
    event ContractSigned(uint256 indexed contractId, address indexed signer);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function approve(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256 balance);
    function cancelContract(uint256 contractId) external payable;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function getContract(uint256 contractId) external view returns (bytes memory out0);
    function getDraft(uint256 contractId) external view returns (bytes memory out0);
    function initContractAndSign(address[] memory counterparties, uint256 hashDigest, string memory url) external payable returns (uint256 out0);
    function isApprovedForAll(address owner, address operator) external view returns (bool out0);
    function isBlocked() external view returns (bool out0);
    function isContractIdAvailable(uint256 contractId) external view returns (bool out0);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function setBlocked(bool blocked) external;
    function setupFeeAndAccount() external view returns (uint256 fee, address account);
    function signContract(uint256 contractId) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool out0);
    function transferFrom(address from, address to, uint256 tokenId) external;
}
