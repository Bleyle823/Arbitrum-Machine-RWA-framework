// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IArbVault} from "../interfaces/IArbVault.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";
import {IToken} from "../vendor/erc3643/token/IToken.sol";
import {ArbRwaNft} from "../nft/ArbRwaNft.sol";

/// @title ArbVault — locks RWA NFT collateral and mints ERC-3643 security tokens once, support burn & redeem
contract ArbVault is IArbVault, Ownable {
    struct NftRef {
        address nft;
        uint256 tokenId;
    }

    address public override depositor;
    address public override identityRegistry;
    bool public override minted;
    bool public override redeemed;
    address public override rewardDistributor;
    address public override token;

    address public vaultTaker;
    address public infoDesk;
    address public feeModule;

    NftRef[] private _deposited;

    mapping(bytes4 => bool) private _supportedInterfaces;

    modifier onlyTaker() {
        require(msg.sender == vaultTaker, "Not vault taker");
        _;
    }

    constructor(address _identityRegistry, address _vaultTaker, address _infoDesk, address _owner) {
        _transferOwnership(_owner);
        identityRegistry = _identityRegistry;
        vaultTaker = _vaultTaker;
        infoDesk = _infoDesk;
        _supportedInterfaces[type(IArbVault).interfaceId] = true;
    }

    function configureKycRequirement(address[] memory claimIssuers, uint256[] memory claimTopics) external override onlyOwner {
        require(claimIssuers.length == claimTopics.length, "Length mismatch");
        claimIssuers;
        claimTopics;
    }

    function setToken(address token_) external override onlyOwner {
        require(token == address(0), "Token set");
        token = token_;
        emit TokenSet(token_);
    }

    function setRewardDistributor(address distributor) external override onlyOwner {
        rewardDistributor = distributor;
    }

    function setVaultTaker(address _vaultTaker) external override onlyOwner {
        vaultTaker = _vaultTaker;
        emit VaultTakerSet(_vaultTaker);
    }

    function setFeeModule(address _feeModule) external onlyOwner {
        feeModule = _feeModule;
    }

    function depositAndMint(address[] memory rwaNft, uint256[] memory tokenIds, uint256 amount)
        external
        override
        onlyTaker
    {
        require(!minted, "Already minted");
        require(rwaNft.length == tokenIds.length && rwaNft.length > 0, "Invalid NFT input");
        require(token != address(0), "Token not set");

        for (uint256 i = 0; i < rwaNft.length; i++) {
            require(ArbRwaNft(_getRwaRegistry()).isRwaNft(rwaNft[i]), "Not RWA NFT");
            IERC721(rwaNft[i]).transferFrom(msg.sender, address(this), tokenIds[i]);
            _deposited.push(NftRef(rwaNft[i], tokenIds[i]));
            emit Deposited(msg.sender, rwaNft[i], tokenIds[i]);
        }

        depositor = msg.sender;
        IToken(token).mint(msg.sender, amount);
        minted = true;
        emit Minted(msg.sender, amount);
    }

    function burnAndRedeem(uint256 amount) external override onlyTaker {
        require(minted, "Not minted");
        require(!redeemed, "Already redeemed");
        require(amount > 0, "Amount must be greater than zero");
        require(token != address(0), "Token not set");

        // Burn security tokens from msg.sender
        IToken(token).burn(msg.sender, amount);

        // Return collateral NFTs back to msg.sender (the vault taker)
        for (uint256 i = 0; i < _deposited.length; i++) {
            IERC721(_deposited[i].nft).transferFrom(address(this), msg.sender, _deposited[i].tokenId);
        }

        redeemed = true;
        emit Burned(msg.sender, amount);
    }

    function nfts() external view override returns (bytes[] memory out0) {
        out0 = new bytes[](_deposited.length);
        for (uint256 i = 0; i < _deposited.length; i++) {
            out0[i] = abi.encode(_deposited[i].nft, _deposited[i].tokenId);
        }
    }

    function transactionFeeAndAccount(uint256 amount) external view override returns (uint256 fee, address account) {
        fee = IInfoDesk(infoDesk).computeTransactionFee(amount);
        account = feeModule;
    }

    function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
        return _supportedInterfaces[interfaceId];
    }

    function rwaRegistry() public view returns (address) {
        return _getRwaRegistry();
    }

    function _getRwaRegistry() internal view returns (address) {
        return IInfoDesk(infoDesk).getContract(1);
    }
}
