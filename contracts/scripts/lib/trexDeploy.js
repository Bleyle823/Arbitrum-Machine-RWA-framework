const hre = require("hardhat");
const OnchainID = require("@onchain-id/solidity");

/**
 * Deploy full ERC-3643 T-REX infrastructure (from ERC-3643/ERC-3643 repo).
 * Uses a single shared ONCHAINID IdFactory (deploy via deployOidStack).
 */
async function deployTrexSuite(deployer, onchainIdFactoryAddress) {
  const claimTopicsRegistryImplementation = await hre.ethers.deployContract("ClaimTopicsRegistry", deployer);
  const trustedIssuersRegistryImplementation = await hre.ethers.deployContract("TrustedIssuersRegistry", deployer);
  const identityRegistryStorageImplementation = await hre.ethers.deployContract("IdentityRegistryStorage", deployer);
  const identityRegistryImplementation = await hre.ethers.deployContract("IdentityRegistry", deployer);
  const modularComplianceImplementation = await hre.ethers.deployContract("ModularCompliance", deployer);
  const tokenImplementation = await hre.ethers.deployContract("Token", deployer);

  const trexImplementationAuthority = await hre.ethers.deployContract(
    "TREXImplementationAuthority",
    [true, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress],
    deployer
  );

  const versionStruct = { major: 4, minor: 1, patch: 0 };
  const contractsStruct = {
    tokenImplementation: await tokenImplementation.getAddress(),
    ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
    irImplementation: await identityRegistryImplementation.getAddress(),
    irsImplementation: await identityRegistryStorageImplementation.getAddress(),
    tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
    mcImplementation: await modularComplianceImplementation.getAddress(),
  };

  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);

  const trexFactory = await hre.ethers.deployContract(
    "TREXFactory",
    [await trexImplementationAuthority.getAddress(), onchainIdFactoryAddress],
    deployer
  );

  const identityFactory = new hre.ethers.Contract(
    onchainIdFactoryAddress,
    OnchainID.contracts.Factory.abi,
    deployer
  );
  await identityFactory.addTokenFactory(await trexFactory.getAddress());

  const trexGateway = await hre.ethers.deployContract(
    "TREXGateway",
    [await trexFactory.getAddress(), true],
    deployer
  );

  return {
    trexImplementationAuthority,
    trexFactory,
    trexGateway,
    identityFactory,
  };
}

/**
 * Deploy NativeTransferFeeModule behind official T-REX ModuleProxy.
 */
async function deployFeeModuleProxy(deployer, infoDeskAddress) {
  const NativeTransferFeeModule = await hre.ethers.getContractFactory("NativeTransferFeeModule");
  const impl = await NativeTransferFeeModule.deploy();
  await impl.waitForDeployment();

  const initData = impl.interface.encodeFunctionData("initialize", [infoDeskAddress]);
  const ModuleProxy = await hre.ethers.getContractFactory("ModuleProxy");
  const proxy = await ModuleProxy.deploy(await impl.getAddress(), initData);
  await proxy.waitForDeployment();

  return { impl, proxy };
}

module.exports = { deployTrexSuite, deployFeeModuleProxy };
