// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";
import {RwaConstants} from "../core/RwaConstants.sol";

/// @title ContractNft — multi-party commercial agreement NFT with draft → signed → completed lifecycle
contract ContractNft is ERC721 {
    using SafeERC20 for IERC20;

    event ContractCancelled(uint256 indexed contractId);
    event ContractCompleted(uint256 indexed contractId, address indexed signer);
    event ContractInitiated(uint256 indexed contractId, address indexed initiator);
    event ContractSigned(uint256 indexed contractId, address indexed signer);

    struct ContractContent {
        address initiator;
        address[] counterparties;
        uint256 hashDigest;
        string url;
    }

    struct ContractDraft {
        ContractContent content;
        address[] signatures;
        bool cancelled;
        bool completed;
    }

    bool public isBlocked;

    address public infoDesk;
    address public feeToken;
    address public rwaNftRegistry;

    mapping(uint256 => ContractDraft) private _drafts;
    mapping(uint256 => ContractContent) private _contracts;

    modifier notBlocked() {
        require(!isBlocked, "Blocked");
        _;
    }

    constructor(address _infoDesk, address _feeToken, address _rwaNftRegistry) ERC721("Contract NFT", "CNFT") {
        infoDesk = _infoDesk;
        feeToken = _feeToken;
        rwaNftRegistry = _rwaNftRegistry;
    }

    function initContractAndSign(address[] memory counterparties, uint256 hashDigest, string memory url)
        external
        payable
        notBlocked
        returns (uint256)
    {
        (uint256 fee, address account) = setupFeeAndAccount();
        if (fee > 0) IERC20(feeToken).safeTransferFrom(msg.sender, account, fee);

        uint256 contractId = uint256(keccak256(abi.encode(msg.sender, counterparties, hashDigest, url)));
        require(isContractIdAvailable(contractId), "ID taken");

        ContractDraft storage draft = _drafts[contractId];
        draft.content = ContractContent(msg.sender, counterparties, hashDigest, url);
        draft.signatures.push(msg.sender);

        emit ContractInitiated(contractId, msg.sender);
        emit ContractSigned(contractId, msg.sender);

        _tryComplete(contractId);
        return contractId;
    }

    function signContract(uint256 contractId) external notBlocked {
        ContractDraft storage draft = _drafts[contractId];
        require(!draft.cancelled && !draft.completed, "Inactive");
        require(_isParticipant(contractId, msg.sender), "Not participant");
        require(!_hasSigned(contractId, msg.sender), "Already signed");

        draft.signatures.push(msg.sender);
        emit ContractSigned(contractId, msg.sender);
        _tryComplete(contractId);
    }

    function cancelContract(uint256 contractId) external payable {
        ContractDraft storage draft = _drafts[contractId];
        require(draft.content.initiator == msg.sender, "Not initiator");
        require(!draft.completed, "Completed");
        draft.cancelled = true;
        emit ContractCancelled(contractId);
    }

    function getDraft(uint256 contractId) external view returns (bytes memory) {
        ContractDraft storage d = _drafts[contractId];
        return abi.encode(d.content, d.signatures);
    }

    function getContract(uint256 contractId) external view returns (bytes memory) {
        return abi.encode(_contracts[contractId]);
    }

    function isContractIdAvailable(uint256 contractId) public view returns (bool) {
        return _drafts[contractId].content.initiator == address(0) && _contracts[contractId].initiator == address(0);
    }

    function setupFeeAndAccount() public view returns (uint256 fee, address account) {
        fee = IInfoDesk(infoDesk).getValue(RwaConstants.VAL_CONTRACT_SETUP_FEE);
        if (fee == 0) fee = 1;
        account = IInfoDesk(infoDesk).getAccount(RwaConstants.ACCT_CONTRACT_FEE);
        if (account == address(0)) account = IInfoDesk(infoDesk).getAccount(RwaConstants.ACCT_FEE_TREASURY);
    }

    function setBlocked(bool blocked) external {
        require(msg.sender == rwaNftRegistry, "Not registry");
        isBlocked = blocked;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override notBlocked {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _tryComplete(uint256 contractId) internal {
        ContractDraft storage draft = _drafts[contractId];
        if (draft.completed || draft.cancelled) return;

        uint256 required = draft.content.counterparties.length + 1;
        if (draft.signatures.length < required) return;

        draft.completed = true;
        _contracts[contractId] = draft.content;
        _safeMint(draft.content.initiator, contractId);

        emit ContractCompleted(contractId, draft.content.initiator);

        if (rwaNftRegistry != address(0)) {
            (bool ok,) = rwaNftRegistry.call(abi.encodeWithSignature("registerContractId(uint256,address)", contractId, address(this)));
            ok;
        }
    }

    function _isParticipant(uint256 contractId, address account) internal view returns (bool) {
        ContractContent storage c = _drafts[contractId].content;
        if (c.initiator == account) return true;
        for (uint256 i = 0; i < c.counterparties.length; i++) {
            if (c.counterparties[i] == account) return true;
        }
        return false;
    }

    function _hasSigned(uint256 contractId, address account) internal view returns (bool) {
        address[] storage sigs = _drafts[contractId].signatures;
        for (uint256 i = 0; i < sigs.length; i++) {
            if (sigs[i] == account) return true;
        }
        return false;
    }
}
