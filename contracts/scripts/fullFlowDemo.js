/**
 * SDK-free end-to-end RWA demo for a running Hardhat / Anvil node.
 *
 * Terminal 1: npx hardhat node
 * Terminal 2: npx hardhat run scripts/fullFlowDemo.js --network localhost
 */
const hre = require("hardhat");
const { deployTrexSuite, deployFeeModuleProxy } = require("./lib/trexDeploy");
const { deployOidClaimIssuer } = require("./lib/onchainidHelpers");
const { CT_KYC_APPROVED, CT_MNFT_ISSUER, addClaim, kycData } = require("./lib/claims");

async function main() {
  const signers = await hre.ethers.getSigners();
  const admin = signers[0];
  const alice = signers[1];
  const bob = signers[2];
  const charlie = signers[3];
  const claimIssuerSigner = signers[4];

  console.log("Roles:");
  console.log("  Admin / regulator / issuer:", admin.address);
  console.log("  Alice (asset owner):", alice.address);
  console.log("  Bob:", bob.address);
  console.log("  Charlie:", charlie.address);
  console.log("  Claim issuer signer:", claimIssuerSigner.address);

  const MockFeeToken = await hre.ethers.getContractFactory("MockFeeToken");
  const feeToken = await MockFeeToken.deploy();
  await feeToken.waitForDeployment();
  for (const s of [alice, bob, charlie, admin]) {
    await feeToken.mint(s.address, hre.ethers.parseEther("10000"));
  }

  const InfoDesk = await hre.ethers.getContractFactory("InfoDesk");
  const infoDesk = await InfoDesk.deploy(admin.address);
  await infoDesk.waitForDeployment();
  await infoDesk.setContract(0, await feeToken.getAddress());
  await infoDesk.setAccount(0, admin.address);
  await infoDesk.setAccount(1, admin.address);
  await infoDesk.setAccount(2, admin.address);
  await infoDesk.setValue(3, hre.ethers.parseEther("0.01"));

  const IdFactory = await hre.ethers.getContractFactory("IdFactory");
  const idFactory = await IdFactory.deploy(admin.address, admin.address);
  await idFactory.waitForDeployment();

  const kycIssuer = await deployOidClaimIssuer(admin, claimIssuerSigner);
  const kycIssuerAddr = await kycIssuer.getAddress();

  const ArbRwaNft = await hre.ethers.getContractFactory("ArbRwaNft");
  const rwaNft = await ArbRwaNft.deploy(admin.address, await infoDesk.getAddress(), await feeToken.getAddress());
  await rwaNft.waitForDeployment();
  await infoDesk.setContract(1, await rwaNft.getAddress());

  await rwaNft.addMachineRegulator(admin.address);
  const contractNftAddr = await rwaNft.deployContractNft.staticCall();
  await rwaNft.deployContractNft();
  console.log("ContractNft deployed at:", contractNftAddr);

  // Identities + KYC
  await idFactory.createIdentity(alice.address, "alice");
  await idFactory.createIdentity(bob.address, "bob");
  await idFactory.createIdentity(charlie.address, "charlie");
  const aliceId = await idFactory.getIdentity(alice.address);
  const bobId = await idFactory.getIdentity(bob.address);
  const charlieId = await idFactory.getIdentity(charlie.address);

  for (const [owner, id, name] of [
    [alice, aliceId, "Alice"],
    [bob, bobId, "Bob"],
    [charlie, charlieId, "Charlie"],
  ]) {
    await addClaim(
      owner,
      id,
      claimIssuerSigner,
      kycIssuerAddr,
      CT_KYC_APPROVED,
      kycData(name, "Test", "1990-01-01", "Berlin")
    );
  }

  // Machine issuer
  await idFactory.createIdentity(admin.address, "issuer");
  const issuerId = await idFactory.getIdentity(admin.address);
  const roleData = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["machine issuer"]);
  await addClaim(
    admin,
    issuerId,
    claimIssuerSigner,
    kycIssuerAddr,
    CT_MNFT_ISSUER,
    roleData
  );
  await rwaNft.setIssuerIdentity(admin.address, issuerId);
  await rwaNft.addMachineIssuer(admin.address);
  const machineNftAddr = await rwaNft.getMachineNftByIssuer(admin.address);
  const machineNft = await hre.ethers.getContractAt("MachineNft", machineNftAddr);

  const machineValue = hre.ethers.parseEther("10");
  const machineId = 1001n;
  const did = hre.ethers.toUtf8Bytes("0x" + "cd".repeat(32));
  await feeToken.connect(alice).approve(machineNftAddr, machineValue);
  await machineNft.connect(admin).registerMachine(alice.address, machineValue, machineId, did);
  console.log("Machine NFT registered, tokenId:", machineId.toString());

  // Contract NFT
  const contractNft = await hre.ethers.getContractAt("ContractNft", contractNftAddr);
  const hashDigest = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("solar-lease-v1"));
  const setupFee = await infoDesk.getValue(3);
  await feeToken.connect(alice).approve(contractNftAddr, setupFee);
  const contractId = await contractNft
    .connect(alice)
    .initContractAndSign.staticCall([bob.address, charlie.address], hashDigest, "ipfs://demo");
  await contractNft.connect(alice).initContractAndSign([bob.address, charlie.address], hashDigest, "ipfs://demo");
  await contractNft.connect(bob).signContract(contractId);
  await contractNft.connect(charlie).signContract(contractId);
  console.log("Contract NFT completed, contractId:", contractId.toString());

  // Deploy TREX Suite
  console.log("Deploying ERC-3643 suite...");
  const trex = await deployTrexSuite(admin);
  const trexFactoryAddr = await trex.trexFactory.getAddress();

  const { proxy: feeModule } = await deployFeeModuleProxy(admin, await infoDesk.getAddress());
  const feeModuleAddr = await feeModule.getAddress();

  const ArbVaultFactory = await hre.ethers.getContractFactory("ArbVaultFactory");
  const vaultFactory = await ArbVaultFactory.deploy(admin.address, await infoDesk.getAddress(), trexFactoryAddr);
  await vaultFactory.waitForDeployment();
  await trex.trexFactory.transferOwnership(await vaultFactory.getAddress());
  await idFactory.addTokenFactory(await vaultFactory.getAddress());

  const tokenAddr = await vaultFactory
    .connect(admin)
    .deployTrexVault.staticCall("Solar Vault", "SOLAR", [kycIssuerAddr], [CT_KYC_APPROVED], [feeModuleAddr]);
  await vaultFactory
    .connect(admin)
    .deployTrexVault("Solar Vault", "SOLAR", [kycIssuerAddr], [CT_KYC_APPROVED], [feeModuleAddr]);

  const attachTx = await vaultFactory
    .connect(admin)
    .attachVaultPeers(tokenAddr, alice.address, await feeToken.getAddress(), [feeModuleAddr]);
  const receipt = await attachTx.wait();
  const created = receipt.logs.find((l) => l.fragment && l.fragment.name === "VaultCreated");
  const vaultAddr = created.args[0];
  const distributorAddr = created.args[2];
  console.log("Vault:", vaultAddr);
  console.log("SecurityToken:", tokenAddr);
  console.log("RewardDistributor:", distributorAddr);

  await vaultFactory.unpauseVaultToken(vaultAddr);

  const vault = await hre.ethers.getContractAt("ArbVault", vaultAddr);
  const ir = await hre.ethers.getContractAt("IdentityRegistry", await vault.identityRegistry());
  for (const [user, id] of [
    [alice.address, aliceId],
    [bob.address, bobId],
    [charlie.address, charlieId],
  ]) {
    await ir.registerIdentity(user, id, 276);
  }

  await machineNft.connect(alice).approve(vaultAddr, machineId);
  await contractNft.connect(alice).approve(vaultAddr, contractId);
  const mintAmount = hre.ethers.parseEther("100");
  await vault.connect(alice).depositAndMint([machineNftAddr, contractNftAddr], [machineId, contractId], mintAmount);

  const token = await hre.ethers.getContractAt("Token", tokenAddr);
  console.log("Alice token balance:", hre.ethers.formatEther(await token.balanceOf(alice.address)));

  const transferAmt = hre.ethers.parseEther("10");
  const [fee] = await vault.transactionFeeAndAccount(transferAmt);
  await feeToken.connect(alice).approve(feeModuleAddr, fee * 3n);
  await token.connect(alice).transfer(bob.address, transferAmt);
  await token.connect(alice).transfer(charlie.address, transferAmt);
  console.log("Bob balance:", hre.ethers.formatEther(await token.balanceOf(bob.address)));

  const distributor = await hre.ethers.getContractAt("RewardDistributor", distributorAddr);
  const yieldAmt = hre.ethers.parseEther("5");
  await feeToken.connect(alice).approve(distributorAddr, yieldAmt);
  await distributor.connect(alice).depositYield(yieldAmt);
  await distributor.connect(bob).claim();
  console.log("Bob claimed yield, fee token balance:", hre.ethers.formatEther(await feeToken.balanceOf(bob.address)));

  console.log("\nDone — full flow completed without peaq SDK.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
