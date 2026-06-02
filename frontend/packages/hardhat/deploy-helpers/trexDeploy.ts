import type { Signer } from "ethers";
import OnchainID from "@onchain-id/solidity";
import { network } from "hardhat";

/**
 * Deploy full ERC-3643 T-REX infrastructure.
 */
export async function deployTrexSuite(deployer: Signer, onchainIdFactoryAddress: string) {
  const { ethers } = await network.connect();

  const claimTopicsRegistryImplementation = await ethers.deployContract("ClaimTopicsRegistry", deployer);
  const trustedIssuersRegistryImplementation = await ethers.deployContract("TrustedIssuersRegistry", deployer);
  const identityRegistryStorageImplementation = await ethers.deployContract("IdentityRegistryStorage", deployer);
  const identityRegistryImplementation = await ethers.deployContract("IdentityRegistry", deployer);
  const modularComplianceImplementation = await ethers.deployContract("ModularCompliance", deployer);
  const tokenImplementation = await ethers.deployContract("Token", deployer);

  const trexImplementationAuthority = await ethers.deployContract(
    "TREXImplementationAuthority",
    [true, ethers.ZeroAddress, ethers.ZeroAddress],
    deployer,
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

  const trexFactory = await ethers.deployContract(
    "TREXFactory",
    [await trexImplementationAuthority.getAddress(), onchainIdFactoryAddress],
    deployer,
  );

  const identityFactory = new ethers.Contract(onchainIdFactoryAddress, OnchainID.contracts.Factory.abi, deployer);
  await identityFactory.addTokenFactory(await trexFactory.getAddress());

  const trexGateway = await ethers.deployContract("TREXGateway", [await trexFactory.getAddress(), true], deployer);

  return {
    trexImplementationAuthority,
    trexFactory,
    trexGateway,
    identityFactory,
  };
}

/**
 * Deploy NativeTransferFeeModule behind T-REX ModuleProxy.
 */
export async function deployFeeModuleProxy(deployer: Signer, infoDeskAddress: string) {
  const { ethers } = await network.connect();

  const NativeTransferFeeModule = await ethers.getContractFactory("NativeTransferFeeModule");
  const impl = await NativeTransferFeeModule.deploy();
  await impl.waitForDeployment();

  const initData = impl.interface.encodeFunctionData("initialize", [infoDeskAddress]);
  const ModuleProxy = await ethers.getContractFactory("ModuleProxy");
  const proxy = await ModuleProxy.deploy(await impl.getAddress(), initData);
  await proxy.waitForDeployment();

  return { impl, proxy };
}

export type TrexSuite = Awaited<ReturnType<typeof deployTrexSuite>>;
export type FeeModuleDeployment = Awaited<ReturnType<typeof deployFeeModuleProxy>>;
