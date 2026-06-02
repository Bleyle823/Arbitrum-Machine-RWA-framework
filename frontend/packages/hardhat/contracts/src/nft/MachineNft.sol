// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";
import {RwaConstants} from "../core/RwaConstants.sol";

/// @title MachineNft — ERC-721 representing a tokenized physical machine with embedded DID document
contract MachineNft is ERC721 {
    using SafeERC20 for IERC20;

    event MachineAdded(address indexed issuer, address indexed to, uint160 indexed machineId);
    event MetadataUpdate(uint256 indexed _tokenId);

    string public issuer;
    string public regulator;
    bool public isBlocked;

    address public immutable issuerWallet;
    address public infoDesk;
    address public feeToken;

    mapping(uint160 => bytes) private _machineDids;

    modifier notBlocked() {
        require(!isBlocked, "Blocked");
        _;
    }

    constructor(
        string memory _issuer,
        string memory _regulator,
        address _issuerWallet,
        address _infoDesk,
        address _feeToken
    ) ERC721("Machine NFT", "MNFT") {
        issuer = _issuer;
        regulator = _regulator;
        issuerWallet = _issuerWallet;
        infoDesk = _infoDesk;
        feeToken = _feeToken;
    }

    function registerMachine(address machineOwner, uint256 machineValue, uint160 tokenId, bytes memory did)
        external
        payable
        notBlocked
        returns (uint160)
    {
        require(msg.sender == issuerWallet, "Not issuer");
        require(machineOwner != address(0), "Zero owner");
        require(!_exists(tokenId), "Token exists");
        require(did.length > 0 && did.length <= RwaConstants.MAX_DID_BYTES, "Invalid DID size");

        (uint256 fee, address account) = registrationFeeAndAccount(machineValue);
        if (fee > 0) {
            address treasury = IInfoDesk(infoDesk).getAccount(RwaConstants.ACCT_MACHINE_FEE);
            if (treasury == address(0)) treasury = IInfoDesk(infoDesk).getAccount(RwaConstants.ACCT_FEE_TREASURY);
            IERC20(feeToken).safeTransferFrom(machineOwner, treasury, fee);
        }

        _machineDids[tokenId] = did;
        _safeMint(machineOwner, tokenId);

        emit MachineAdded(msg.sender, machineOwner, tokenId);
        return tokenId;
    }

    function updateDid(uint160 tokenId, bytes memory did) external notBlocked {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(did.length > 0 && did.length <= RwaConstants.MAX_DID_BYTES, "Invalid DID size");
        _machineDids[tokenId] = did;
        emit MetadataUpdate(tokenId);
    }

    function getMachineDid(uint160 tokenId) external view returns (bytes memory) {
        require(_exists(tokenId), "No token");
        return _machineDids[tokenId];
    }

    function registrationFeeAndAccount(uint256 machineValue) public view returns (uint256 fee, address account) {
        fee = IInfoDesk(infoDesk).computeMachineRegistrationFee(machineValue);
        account = address(this); // machine owner approves this contract; fee is forwarded to treasury
    }

    function setBlocked(bool blocked) external {
        require(msg.sender == issuerWallet, "Not issuer");
        isBlocked = blocked;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override notBlocked {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
