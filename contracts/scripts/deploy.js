const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { deployTrexSuite, deployFeeModuleProxy } = require("./lib/trexDeploy");
const { deployOidClaimIssuer } = require("./lib/onchainidHelpers");

/**
 * Deploy RWA framework + ERC-3643 T-REX (primary target: Arbitrum).
 *
 *   npx hardhat run scripts/deploy.js --network arbitrumSepolia
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY — deployer
 *   ARB_SEPOLIA_RPC_URL   — optional RPC override
 *   FEE_TOKEN_ADDRESS     — USDC on Arbitrum; deploys MockFeeToken if unset
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  let feeTokenAddress = process.env.FEE_TOKEN_ADDRESS;
  if (!feeTokenAddress) {
    const MockFeeToken = await hre.ethers.getContractFactory("MockFeeToken");
    const feeToken = await MockFeeToken.deploy();
    await feeToken.waitForDeployment();
    feeTokenAddress = await feeToken.getAddress();
    console.log("MockFeeToken:", feeTokenAddress);
  }

  const InfoDesk = await hre.ethers.getContractFactory("InfoDesk");
  const infoDesk = await InfoDesk.deploy(deployer.address);
  await infoDesk.waitForDeployment();
  const infoDeskAddr = await infoDesk.getAddress();
  console.log("InfoDesk:", infoDeskAddr);

  await infoDesk.setContract(0, feeTokenAddress);
  await infoDesk.setAccount(0, deployer.address);
  await infoDesk.setAccount(1, deployer.address);
  await infoDesk.setAccount(2, deployer.address);
  await infoDesk.setValue(3, hre.ethers.parseEther("0.01"));
  // VAL_DID_METHOD = 4 → DID_METHOD_ARBITRUM (0); use setValue(4, 1) for did:peaq:

  const IdFactory = await hre.ethers.getContractFactory("IdFactory");
  const idFactory = await IdFactory.deploy(deployer.address, deployer.address);
  await idFactory.waitForDeployment();
  const idFactoryAddr = await idFactory.getAddress();
  console.log("IdFactory:", idFactoryAddr);

  const kycIssuer = await deployOidClaimIssuer(deployer, deployer);
  const kycIssuerAddr = await kycIssuer.getAddress();
  console.log("ClaimIssuer ONCHAINID (KYC):", kycIssuerAddr);

  console.log("\nDeploying ERC-3643 T-REX suite...");
  const trex = await deployTrexSuite(deployer);
  const trexFactoryAddr = await trex.trexFactory.getAddress();
  const trexGatewayAddr = await trex.trexGateway.getAddress();
  const trexIaAddr = await trex.trexImplementationAuthority.getAddress();
  const oidFactoryAddr = await trex.identityFactory.getAddress();
  console.log("TREXImplementationAuthority:", trexIaAddr);
  console.log("TREXFactory:", trexFactoryAddr);
  console.log("TREXGateway:", trexGatewayAddr);
  console.log("ONCHAINID IdFactory:", oidFactoryAddr);

  const { impl: feeModuleImpl, proxy: feeModuleProxy } = await deployFeeModuleProxy(deployer, infoDeskAddr);
  console.log("NativeTransferFeeModule impl:", await feeModuleImpl.getAddress());
  console.log("NativeTransferFeeModule proxy:", await feeModuleProxy.getAddress());

  await infoDesk.setImplementation(4, await feeModuleImpl.getAddress());

  const ArbRwaNft = await hre.ethers.getContractFactory("ArbRwaNft");
  const rwaNft = await ArbRwaNft.deploy(deployer.address, infoDeskAddr, feeTokenAddress);
  await rwaNft.waitForDeployment();
  const rwaNftAddr = await rwaNft.getAddress();
  console.log("ArbRwaNft:", rwaNftAddr);
  await infoDesk.setContract(1, rwaNftAddr);

  const ArbVaultFactory = await hre.ethers.getContractFactory("ArbVaultFactory");
  const vaultFactory = await ArbVaultFactory.deploy(deployer.address, infoDeskAddr, trexFactoryAddr);
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddr = await vaultFactory.getAddress();
  console.log("ArbVaultFactory:", vaultFactoryAddr);

  await trex.trexFactory.transferOwnership(vaultFactoryAddr);
  console.log("TREXFactory ownership → ArbVaultFactory");

  await idFactory.addTokenFactory(vaultFactoryAddr);

  const addresses = {
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    onchainid: {
      idFactory: idFactoryAddr,
      kycVerifier: kycIssuerAddr,
      implementationAuthority: await trex.identityImplementationAuthority.getAddress(),
      oidFactory: oidFactoryAddr,
    },
    trex: {
      trexImplementationAuthority: trexIaAddr,
      iaFactory: hre.ethers.ZeroAddress,
      trexFactory: trexFactoryAddr,
      trexGateway: trexGatewayAddr,
    },
    nft: { arbRwaNft: rwaNftAddr },
    vault: { factory: vaultFactoryAddr, infoDesk: infoDeskAddr },
    erc20: { feeToken: feeTokenAddress },
    implementations: {
      nativeTransferFeeModule: await feeModuleImpl.getAddress(),
      nativeTransferFeeModuleProxy: await feeModuleProxy.getAddress(),
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `deployment-${addresses.chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));
  console.log("\nWrote", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
