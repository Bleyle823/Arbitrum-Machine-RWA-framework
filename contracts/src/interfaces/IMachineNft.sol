// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IMachineNft {
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event BatchMetadataUpdate(uint256 indexed _fromTokenId, uint256 indexed _toTokenId);
    event MachineAdded(address indexed issuer, address indexed to, uint160 indexed machineId);
    event MetadataUpdate(uint256 indexed _tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function approve(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256 balance);
    function getApproved(uint256 tokenId) external view returns (address operator);
    function getMachineDid(uint160 tokenId) external view returns (bytes memory out0);
    function isApprovedForAll(address owner, address operator) external view returns (bool out0);
    function isBlocked() external view returns (bool out0);
    function issuer() external view returns (string memory out0);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function registerMachine(address machineOwner, uint256 machineValue, uint160 tokenId, bytes memory did) external payable returns (uint160 out0);
    function registrationFeeAndAccount(uint256 machineValue) external view returns (uint256 fee, address account);
    function regulator() external view returns (string memory out0);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function setBlocked(bool blocked) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool out0);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function updateDid(uint160 tokenId, bytes memory did) external;
}
