const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContractNft views and indexing", function () {
  let admin, alice, bob, charlie;
  let infoDesk, feeToken, rwaNft, contractNft;

  beforeEach(async function () {
    [admin, alice, bob, charlie] = await ethers.getSigners();

    const MockFeeToken = await ethers.getContractFactory("MockFeeToken");
    feeToken = await MockFeeToken.deploy();
    await feeToken.mint(alice.address, ethers.parseEther("1000"));

    const InfoDesk = await ethers.getContractFactory("InfoDesk");
    infoDesk = await InfoDesk.deploy(admin.address);
    await infoDesk.setContract(0, await feeToken.getAddress());
    await infoDesk.setAccount(0, admin.address);
    await infoDesk.setAccount(1, admin.address);
    await infoDesk.setAccount(2, admin.address);
    await infoDesk.setValue(3, ethers.parseEther("0.01"));

    const ArbRwaNft = await ethers.getContractFactory("ArbRwaNft");
    rwaNft = await ArbRwaNft.deploy(
      admin.address,
      await infoDesk.getAddress(),
      await feeToken.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
    const contractNftAddr = await rwaNft.deployContractNft.staticCall();
    await rwaNft.deployContractNft();
    contractNft = await ethers.getContractAt("ContractNft", contractNftAddr);
  });

  it("computeContractId matches init return value", async function () {
    const hashDigest = ethers.keccak256(ethers.toUtf8Bytes("test-agreement-v1"));
    const url = "ipfs://bafytest";
    const counterparties = [bob.address, charlie.address];

    const predicted = await contractNft.computeContractId(alice.address, counterparties, hashDigest, url);
    const fee = await contractNft.setupFeeAndAccount();
    await feeToken.connect(alice).approve(await contractNft.getAddress(), fee[0]);

    const txId = await contractNft
      .connect(alice)
      .initContractAndSign.staticCall(counterparties, hashDigest, url);
    expect(txId).to.equal(predicted);

    await contractNft.connect(alice).initContractAndSign(counterparties, hashDigest, url);
    const ids = await contractNft.getContractIdsByInitiator(alice.address);
    expect(ids.map(String)).to.include(String(predicted));
  });

  it("getDraftStatus and getContractDetails through lifecycle", async function () {
    const hashDigest = ethers.keccak256(ethers.toUtf8Bytes("lifecycle"));
    const url = "ipfs://demo2";
    const counterparties = [bob.address, charlie.address];
    const contractId = await contractNft.computeContractId(alice.address, counterparties, hashDigest, url);

    const fee = await contractNft.setupFeeAndAccount();
    await feeToken.connect(alice).approve(await contractNft.getAddress(), fee[0]);
    await contractNft.connect(alice).initContractAndSign(counterparties, hashDigest, url);

    let status = await contractNft.getDraftStatus(contractId);
    expect(status.exists).to.equal(true);
    expect(status.completed).to.equal(false);
    expect(status.requiredSignatures).to.equal(3n);
    expect(status.currentSignatures).to.equal(1n);

    await contractNft.connect(bob).signContract(contractId);
    status = await contractNft.getDraftStatus(contractId);
    expect(status.currentSignatures).to.equal(2n);

    await contractNft.connect(charlie).signContract(contractId);
    status = await contractNft.getDraftStatus(contractId);
    expect(status.completed).to.equal(true);

    const details = await contractNft.getContractDetails(contractId);
    expect(details.initiator).to.equal(alice.address);
    expect(details.url).to.equal(url);
    expect(details.completed).to.equal(true);
    expect(await contractNft.ownerOf(contractId)).to.equal(alice.address);
  });

  it("signContract reverts Inactive when already completed", async function () {
    const hashDigest = ethers.keccak256(ethers.toUtf8Bytes("done"));
    const url = "ipfs://done";
    const counterparties = [bob.address];
    const fee = await contractNft.setupFeeAndAccount();
    await feeToken.connect(alice).approve(await contractNft.getAddress(), fee[0]);
    const contractId = await contractNft
      .connect(alice)
      .initContractAndSign.staticCall(counterparties, hashDigest, url);
    await contractNft.connect(alice).initContractAndSign(counterparties, hashDigest, url);
    await contractNft.connect(bob).signContract(contractId);

    let reverted = false;
    try {
      await contractNft.connect(bob).signContract(contractId);
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });
});
