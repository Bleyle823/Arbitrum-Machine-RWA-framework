import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Scaffold ETH 2 deploy script — copy to:
 *   packages/hardhat/deploy/01_deploy_rwa_framework.ts
 *
 * No peaq SDK dependency. Wires framework contracts for local / testnet UI testing.
 */
const deployRwaFramework: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, execute, get, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const feeToken = await deploy("MockFeeToken", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const infoDesk = await deploy("InfoDesk", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  await execute("InfoDesk", { from: deployer, log: true }, "setContract", 0, feeToken.address);
  await execute("InfoDesk", { from: deployer, log: true }, "setAccount", 0, deployer);
  await execute("InfoDesk", { from: deployer, log: true }, "setAccount", 1, deployer);
  await execute("InfoDesk", { from: deployer, log: true }, "setAccount", 2, deployer);
  await execute(
    "InfoDesk",
    { from: deployer, log: true },
    "setValue",
    3,
    ethers.parseEther("0.01")
  );

  const idFactory = await deploy("IdFactory", {
    from: deployer,
    args: [deployer, deployer],
    log: true,
    autoMine: true,
  });

  const kycIssuer = await deploy("ClaimIssuer", {
    from: deployer,
    contract: "ClaimIssuer",
    args: [deployer, deployer],
    log: true,
    autoMine: true,
  });

  const rwaNft = await deploy("PeaqRwaNft", {
    from: deployer,
    args: [deployer, infoDesk.address, feeToken.address],
    log: true,
    autoMine: true,
  });

  await execute("InfoDesk", { from: deployer, log: true }, "setContract", 1, rwaNft.address);

  const feeModuleImpl = await deploy("NativeTransferFeeModuleImpl", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await execute("InfoDesk", { from: deployer, log: true }, "setImplementation", 4, feeModuleImpl.address);

  const vaultFactory = await deploy("PeaqVaultFactory", {
    from: deployer,
    args: [deployer, infoDesk.address],
    log: true,
    autoMine: true,
  });

  await execute("IdFactory", { from: deployer, log: true }, "addTokenFactory", vaultFactory.address);

  // Fund default burner wallets (accounts 1–4) for manual UI testing
  const signers = await ethers.getSigners();
  const fee = await ethers.getContractAt("MockFeeToken", feeToken.address);
  for (let i = 1; i <= 4 && i < signers.length; i++) {
    await fee.mint(signers[i].address, ethers.parseEther("10000"));
  }

  log("RWA framework deployed (SDK-free)");
  log(`  MockFeeToken: ${feeToken.address}`);
  log(`  InfoDesk: ${infoDesk.address}`);
  log(`  IdFactory: ${idFactory.address}`);
  log(`  ClaimIssuer: ${kycIssuer.address}`);
  log(`  PeaqRwaNft: ${rwaNft.address}`);
  log(`  PeaqVaultFactory: ${vaultFactory.address}`);
};

export default deployRwaFramework;
deployRwaFramework.tags = ["RwaFramework"];
deployRwaFramework.dependencies = [];
deployRwaFramework.runAtTheEnd = true;
