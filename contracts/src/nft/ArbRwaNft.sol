// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IArbRwaNft} from "../interfaces/IArbRwaNft.sol";
import {RwaIdentity} from "../identity/Identity.sol";
import {MachineNft} from "./MachineNft.sol";
import {ContractNft} from "./ContractNft.sol";
import {RwaConstants} from "../core/RwaConstants.sol";
import {IInfoDesk} from "../interfaces/IInfoDesk.sol";

/// @title ArbRwaNft — RWA NFT registry (machine issuers, regulators, contract NFT routing)
contract ArbRwaNft is IArbRwaNft, Ownable {
    address public infoDesk;
    address public feeToken;

    address[] private _machineIssuers;
    address[] private _machineRegulators;

    mapping(address => bool) private _isIssuer;
    mapping(address => bool) private _isRegulator;
    mapping(address => address) private _issuerToMachineNft;
    mapping(address => bool) private _isContractNft;
    mapping(address => bool) private _isMachineNftAddr;

    mapping(uint256 => address) public override findContractNft;

    mapping(address => bool) private _blocked;

    event MachineNftDeployed(address indexed issuer, address indexed machineNft);

    constructor(address owner_, address infoDesk_, address feeToken_) {
        _transferOwnership(owner_);
        infoDesk = infoDesk_;
        feeToken = feeToken_;
    }

    function addMachineRegulator(address regulator) external override onlyOwner {
        require(!_isRegulator[regulator], "Exists");
        _isRegulator[regulator] = true;
        _machineRegulators.push(regulator);
        emit MachineRegulatorAdded(regulator);
    }

    function removeMachineRegulator(address regulator) external override onlyOwner {
        require(_isRegulator[regulator], "Not regulator");
        _isRegulator[regulator] = false;
        emit MachineRegulatorRemoved(regulator);
    }

    function addMachineIssuer(address issuer) external override {
        require(_isRegulator[msg.sender] || msg.sender == owner(), "Not regulator");
        require(!_isIssuer[issuer], "Exists");
        require(_hasRoleClaim(issuer, RwaConstants.CT_MNFT_ISSUER), "Missing issuer claim");

        string memory issuerDid = string(abi.encodePacked(_didPrefix(), "issuer:", _addressToString(issuer)));
        string memory regulatorDid = string(abi.encodePacked(_didPrefix(), "regulator:", _addressToString(msg.sender)));

        MachineNft mnft = new MachineNft(issuerDid, regulatorDid, issuer, infoDesk, feeToken);

        _isIssuer[issuer] = true;
        _machineIssuers.push(issuer);
        _issuerToMachineNft[issuer] = address(mnft);
        _isMachineNftAddr[address(mnft)] = true;

        emit MachineIssuerAdded(issuer, address(mnft));
        emit MachineNftDeployed(issuer, address(mnft));
    }

    function removeMachineIssuer(address issuer) external override {
        require(_isRegulator[msg.sender] || msg.sender == owner(), "Not regulator");
        require(_isIssuer[issuer], "Not issuer");
        _isIssuer[issuer] = false;
        emit MachineIssuerRemoved(msg.sender, issuer);
    }

    function addContractNft() external override {
        ContractNft cnft = new ContractNft(infoDesk, feeToken, address(this));
        _isContractNft[msg.sender] = true;
        _isContractNft[address(cnft)] = true;
        emit ContractNftAdded(address(cnft));
    }

    function registerContractId(uint256 contractId, address contractNft) external {
        require(_isContractNft[contractNft], "Unknown CNFT");
        findContractNft[contractId] = contractNft;
    }

    function deployContractNft() external returns (address) {
        ContractNft cnft = new ContractNft(infoDesk, feeToken, address(this));
        _isContractNft[address(cnft)] = true;
        emit ContractNftAdded(address(cnft));
        return address(cnft);
    }

    function setMachineNftBlockState(address issuerOrContractNft, bool blocked) external override {
        require(_isRegulator[msg.sender] || msg.sender == owner(), "Not regulator");
        _blocked[issuerOrContractNft] = blocked;
        if (_isMachineNftAddr[issuerOrContractNft]) {
            MachineNft(issuerOrContractNft).setBlocked(blocked);
        }
        if (_isContractNft[issuerOrContractNft]) {
            ContractNft(issuerOrContractNft).setBlocked(blocked);
        }
    }

    // Renamed getters/helper overrides
    function getMachineIssuers() external view override returns (address[] memory) {
        return _machineIssuers;
    }

    function getMachineRegulators() external view override returns (address[] memory) {
        return _machineRegulators;
    }

    function getMachineNftByIssuer(address issuer) external view override returns (address) {
        return _issuerToMachineNft[issuer];
    }

    function isContractNft(address addr) external view override returns (bool) {
        return _isContractNft[addr];
    }

    function isMachineNft(address addr) external view override returns (bool) {
        return _isMachineNftAddr[addr];
    }

    function isRwaNft(address addr) external view override returns (bool) {
        return _isContractNft[addr] || _isMachineNftAddr[addr];
    }

    mapping(address => address) public issuerIdentities;

    function _hasRoleClaim(address issuer, uint256 topic) internal view returns (bool) {
        address id = issuerIdentities[issuer];
        if (id == address(0)) return false;
        return RwaIdentity(id).hasClaimTopic(topic);
    }

    function setIssuerIdentity(address issuer, address identity) external onlyOwner {
        issuerIdentities[issuer] = identity;
    }

    /// @dev DID prefix from InfoDesk: `did:arbitrum:` (default), `did:peaq:`, or `did:rwa:`
    function _didPrefix() internal view returns (string memory) {
        uint256 method = IInfoDesk(infoDesk).getValue(RwaConstants.VAL_DID_METHOD);
        if (method == RwaConstants.DID_METHOD_PEAQ) {
            return "did:peaq:";
        }
        if (method == RwaConstants.DID_METHOD_RWA) {
            return "did:rwa:";
        }
        return "did:arbitrum:";
    }

    function _addressToString(address a) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(a);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
