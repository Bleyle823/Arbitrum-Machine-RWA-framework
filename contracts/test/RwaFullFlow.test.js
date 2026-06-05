const { expect } = require("chai");
const { ethers } = require("hardhat");
const OnchainID = require("@onchain-id/solidity");
const { deployTrexSuite, deployFeeModuleProxy } = require("../scripts/lib/trexDeploy");
const { deployOidStack, deployOidClaimIssuer } = require("../scripts/lib/onchainidHelpers");
const { CT_KYC_APPROVED, CT_MNFT_ISSUER, CT_MNFT_REGULATOR, addClaim, kycData, roleData } = require("../scripts/lib/claims");
const {
  DEMO_MACHINE_TOKEN_ID,
  DEMO_MACHINE_VALUE,
  demoMachineDidBytes,
  DEMO_VAULT_NAME,
  DEMO_VAULT_SYMBOL,
} = require("../scripts/lib/demoProductionAssets");

describe("RWA full flow (ERC-3643 T-REX)", function () {
  it("deploys framework and runs identity → machine → T-REX vault → transfer", async function () {
    const [admin, alice, bob, claimIssuerSigner] = await ethers.getSigners();

    const MockFeeToken = await ethers.getContractFactory("MockFeeToken");
    const feeToken = await MockFeeToken.deploy();
    await feeToken.mint(alice.address, DEMO_MACHINE_VALUE + ethers.parseEther("1000"));
    await feeToken.mint(bob.address, ethers.parseEther("1000"));

    const InfoDesk = await ethers.getContractFactory("InfoDesk");
    const infoDesk = await InfoDesk.deploy(admin.address);
    await infoDesk.setContract(0, await feeToken.getAddress());
    await infoDesk.setAccount(0, admin.address);
    await infoDesk.setAccount(1, admin.address);
    await infoDesk.setAccount(2, admin.address);
    await infoDesk.setValue(3, ethers.parseEther("0.01"));

    const oid = await deployOidStack(admin);
    const idFactory = new ethers.Contract(oid.onchainIdFactoryAddr, OnchainID.contracts.Factory.abi, admin);

    const kycIssuer = await deployOidClaimIssuer(admin, claimIssuerSigner);
    const kycIssuerAddr = await kycIssuer.getAddress();

    const trex = await deployTrexSuite(admin, oid.onchainIdFactoryAddr);
    const trexFactory = trex.trexFactory;

    const ArbRwaNft = await ethers.getContractFactory("ArbRwaNft");
    const MachineNftFactory = await ethers.getContractFactory("MachineNftFactory");
    const machineNftFactory = await MachineNftFactory.deploy();
    const ContractNftFactory = await ethers.getContractFactory("ContractNftFactory");
    const contractNftFactory = await ContractNftFactory.deploy();
    const rwaNft = await ArbRwaNft.deploy(
      admin.address,
      await infoDesk.getAddress(),
      await feeToken.getAddress(),
      oid.onchainIdFactoryAddr,
      kycIssuerAddr,
      await machineNftFactory.getAddress(),
      await contractNftFactory.getAddress()
    );
    await infoDesk.setContract(1, await rwaNft.getAddress());

    const { proxy: feeModule } = await deployFeeModuleProxy(admin, await infoDesk.getAddress());
    const feeModuleAddr = await feeModule.getAddress();

    const ArbVaultFactory = await ethers.getContractFactory("ArbVaultFactory");
    const vaultFactory = await ArbVaultFactory.deploy(admin.address, await infoDesk.getAddress(), await trexFactory.getAddress());
    await trexFactory.transferOwnership(await vaultFactory.getAddress());

    await idFactory.createIdentity(alice.address, "alice-salt");
    await idFactory.createIdentity(bob.address, "bob-salt");
    const aliceIdentity = await idFactory.getIdentity(alice.address);
    const bobIdentity = await idFactory.getIdentity(bob.address);

    await addClaim(alice, aliceIdentity, claimIssuerSigner, kycIssuerAddr, CT_KYC_APPROVED, kycData("Alice", "Test", "1990-01-01", "Berlin"));
    await addClaim(bob, bobIdentity, claimIssuerSigner, kycIssuerAddr, CT_KYC_APPROVED, kycData("Bob", "Test", "1990-01-01", "Berlin"));

    await idFactory.createIdentity(admin.address, "issuer-salt");
    const issuerIdentity = await idFactory.getIdentity(admin.address);
    await addClaim(admin, issuerIdentity, claimIssuerSigner, kycIssuerAddr, CT_MNFT_ISSUER, roleData("machine issuer"));
    await addClaim(admin, issuerIdentity, claimIssuerSigner, kycIssuerAddr, CT_MNFT_REGULATOR, roleData("machine regulator"));

    await rwaNft.addMachineRegulator(admin.address);
    await rwaNft.addMachineIssuer(admin.address);
    const machineNftAddr = await rwaNft.getMachineNftByIssuer(admin.address);

    const machineNft = await ethers.getContractAt("MachineNft", machineNftAddr);
    const machineValue = DEMO_MACHINE_VALUE;
    const tokenId = DEMO_MACHINE_TOKEN_ID;
    const did = demoMachineDidBytes();
    await feeToken.connect(alice).approve(machineNftAddr, machineValue);
    await machineNft.connect(admin).registerMachine(alice.address, machineValue, tokenId, did);

    const tokenAddr = await vaultFactory
      .connect(admin)
      .deployTrexVault.staticCall(DEMO_VAULT_NAME, DEMO_VAULT_SYMBOL, [kycIssuerAddr], [CT_KYC_APPROVED], [feeModuleAddr]);
    await vaultFactory
      .connect(admin)
      .deployTrexVault(DEMO_VAULT_NAME, DEMO_VAULT_SYMBOL, [kycIssuerAddr], [CT_KYC_APPROVED], [feeModuleAddr]);

    const attachTx = await vaultFactory
      .connect(admin)
      .attachVaultPeers(tokenAddr, alice.address, await feeToken.getAddress(), [feeModuleAddr]);
    const receipt = await attachTx.wait();
    const vaultCreated = receipt.logs.find((l) => l.fragment && l.fragment.name === "VaultCreated");
    const vaultAddr = vaultCreated.args[0];

    await vaultFactory.unpauseVaultToken(vaultAddr);

    const token = await ethers.getContractAt("Token", tokenAddr);
    const irAddr = await token.identityRegistry();
    const ir = await ethers.getContractAt("IdentityRegistry", irAddr);
    await ir.registerIdentity(alice.address, aliceIdentity, 276);
    await ir.registerIdentity(bob.address, bobIdentity, 276);

    await machineNft.connect(alice).approve(vaultAddr, tokenId);
    const vault = await ethers.getContractAt("ArbVault", vaultAddr);
    await vault.connect(alice).depositAndMint([machineNftAddr], [tokenId], ethers.parseEther("100"));

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));

    const transferAmt = ethers.parseEther("10");
    const [fee] = await vault.transactionFeeAndAccount(transferAmt);
    await feeToken.connect(alice).approve(feeModuleAddr, fee * 2n);
    await token.connect(alice).transfer(bob.address, transferAmt);
    expect(await token.balanceOf(bob.address)).to.equal(transferAmt);

    const yieldAmt = ethers.parseEther("10");
    const distributorAddr = await vault.rewardDistributor();
    const distributor = await ethers.getContractAt("RewardDistributor", distributorAddr);

    await feeToken.connect(alice).approve(distributorAddr, yieldAmt);
    await distributor.connect(alice).depositYield(yieldAmt);

    const bobBal = await token.balanceOf(bob.address);
    const [fee2] = await vault.transactionFeeAndAccount(bobBal);
    await feeToken.connect(bob).approve(feeModuleAddr, fee2 * 2n);
    await token.connect(bob).transfer(alice.address, bobBal);

    await distributor.connect(bob).claim();
    const bobFeeBalance = await feeToken.balanceOf(bob.address);
    expect(bobFeeBalance > ethers.parseEther("1000")).to.be.true;

    const aliceBal = await token.balanceOf(alice.address);
    await vault.connect(alice).burnAndRedeem(aliceBal);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    expect(await vault.redeemed()).to.be.true;

    expect(await machineNft.ownerOf(tokenId)).to.equal(alice.address);
  });
});
