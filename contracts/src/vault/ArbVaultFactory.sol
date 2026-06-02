// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IArbVaultFactory} from "../interfaces/IArbVaultFactory.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";
import {ITREXFactory} from "../vendor/erc3643/factory/ITREXFactory.sol";
import {IToken} from "../vendor/erc3643/token/IToken.sol";
import {AgentRole} from "../vendor/erc3643/roles/AgentRole.sol";
import {ArbVault} from "./ArbVault.sol";
import {RewardDistributor} from "./RewardDistributor.sol";

/// @title ArbVaultFactory — ERC-3643 T-REX suite + RWA vault per asset pool
contract ArbVaultFactory is IArbVaultFactory, Ownable {
    address public infoDesk;
    address public trexFactory;

    mapping(address => bool) private _isVault;
    mapping(string => address) private _tokenBySalt;
    uint256 private _vaultNonce;

    constructor(address owner_, address infoDesk_, address trexFactory_) {
        _transferOwnership(owner_);
        infoDesk = infoDesk_;
        trexFactory = trexFactory_;
    }

    /// @inheritdoc IArbVaultFactory
    function createVault(
        address vaultTaker,
        string memory name,
        string memory symbol,
        address asset,
        address tokenIdentity,
        address[] memory claimIssuers,
        uint256[] memory claimTopics,
        address[] memory complianceModules
    ) external override onlyOwner returns (address vaultAddr, address tokenAddr, address distributorAddr) {
        tokenAddr = _deployTrexSuite(name, symbol, claimIssuers, claimTopics, complianceModules);
        (vaultAddr, distributorAddr) = _attachVaultPeers(tokenAddr, vaultTaker, asset, complianceModules);
        tokenIdentity;
        emit VaultCreated(vaultAddr, tokenAddr, distributorAddr);
    }

    /// @notice Step 1 — deploy ERC-3643 token + registries (heavy; may need its own tx on gas-capped networks)
    function deployTrexVault(
        string memory name,
        string memory symbol,
        address[] memory claimIssuers,
        uint256[] memory claimTopics,
        address[] memory complianceModules
    ) external onlyOwner returns (address tokenAddr) {
        tokenAddr = _deployTrexSuite(name, symbol, claimIssuers, claimTopics, complianceModules);
    }

    /// @notice Step 2 — deploy ArbVault + RewardDistributor and wire agents
    function attachVaultPeers(
        address tokenAddr,
        address vaultTaker,
        address asset,
        address[] memory complianceModules
    ) external onlyOwner returns (address vaultAddr, address distributorAddr) {
        (vaultAddr, distributorAddr) = _attachVaultPeers(tokenAddr, vaultTaker, asset, complianceModules);
        emit VaultCreated(vaultAddr, tokenAddr, distributorAddr);
    }

    function _deployTrexSuite(
        string memory name,
        string memory symbol,
        address[] memory claimIssuers,
        uint256[] memory claimTopics,
        address[] memory complianceModules
    ) internal returns (address tokenAddr) {
        require(claimIssuers.length == claimTopics.length, "Issuer/topic mismatch");
        require(complianceModules.length > 0, "Need compliance module");

        _vaultNonce++;
        string memory salt = string(abi.encodePacked("rwa-vault-", _vaultNonce));
        require(_tokenBySalt[salt] == address(0), "Salt used");

        uint256[][] memory issuerClaims = new uint256[][](claimIssuers.length);
        for (uint256 i = 0; i < claimIssuers.length; i++) {
            issuerClaims[i] = new uint256[](claimTopics.length);
            for (uint256 j = 0; j < claimTopics.length; j++) {
                issuerClaims[i][j] = claimTopics[j];
            }
        }

        address[] memory irAgents = new address[](2);
        irAgents[0] = address(this);
        irAgents[1] = owner();

        address[] memory tokenAgents = new address[](1);
        tokenAgents[0] = address(this);

        ITREXFactory.TokenDetails memory td = ITREXFactory.TokenDetails({
            owner: address(this),
            name: name,
            symbol: symbol,
            decimals: 18,
            irs: address(0),
            ONCHAINID: address(0),
            irAgents: irAgents,
            tokenAgents: tokenAgents,
            complianceModules: complianceModules,
            complianceSettings: new bytes[](0)
        });

        ITREXFactory.ClaimDetails memory cd = ITREXFactory.ClaimDetails({
            claimTopics: claimTopics,
            issuers: claimIssuers,
            issuerClaims: issuerClaims
        });

        ITREXFactory(trexFactory).deployTREXSuite(salt, td, cd);

        tokenAddr = ITREXFactory(trexFactory).getToken(salt);
        require(tokenAddr != address(0), "Token not deployed");
        _tokenBySalt[salt] = tokenAddr;
    }

    function _attachVaultPeers(
        address tokenAddr,
        address vaultTaker,
        address asset,
        address[] memory complianceModules
    ) internal returns (address vaultAddr, address distributorAddr) {
        address ir = address(IToken(tokenAddr).identityRegistry());

        ArbVault vault = new ArbVault(ir, vaultTaker, infoDesk, address(this));
        vaultAddr = address(vault);

        AgentRole(tokenAddr).addAgent(vaultAddr);

        vault.setToken(tokenAddr);
        if (complianceModules.length > 0) {
            vault.setFeeModule(complianceModules[0]);
        }

        RewardDistributor distributor = new RewardDistributor();
        distributor.initialize(tokenAddr, asset, vaultTaker);
        distributorAddr = address(distributor);
        vault.setRewardDistributor(distributorAddr);

        // Wire reward distributor into the security token for transfer hook settleOnTransfer
        IToken(tokenAddr).setRewardDistributor(distributorAddr);

        vault.transferOwnership(owner());

        _isVault[vaultAddr] = true;
    }

    function isArbVault(address vault) external view override returns (bool) {
        return _isVault[vault];
    }

    function pauseVaultToken(address vault) external override onlyOwner {
        require(_isVault[vault], "Not vault");
        address token = ArbVault(vault).token();
        IToken(token).pause();
        emit VaultTokenPaused(vault, token);
    }

    function unpauseVaultToken(address vault) external override onlyOwner {
        require(_isVault[vault], "Not vault");
        address token = ArbVault(vault).token();
        IToken(token).unpause();
        emit VaultTokenUnpaused(vault, token);
    }

    function setInfoDesk(address infoDesk_) external onlyOwner {
        infoDesk = infoDesk_;
    }

    function setTrexFactory(address trexFactory_) external onlyOwner {
        trexFactory = trexFactory_;
    }
}
