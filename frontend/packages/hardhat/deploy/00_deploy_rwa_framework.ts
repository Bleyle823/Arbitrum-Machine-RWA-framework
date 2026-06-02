import { network } from "hardhat";
import { deployScript, artifacts } from "../rocketh/deploy.js";
import { deployFeeModuleProxy, deployTrexSuite } from "../deploy-helpers/trexDeploy.js";
import { deployOidClaimIssuer } from "../deploy-helpers/onchainidHelpers.js";
import OnchainID from "@onchain-id/solidity";

/**
 * Deploy RWA framework + ERC-3643 T-REX suite (Arbitrum-ready).
 *
 *   yarn deploy --tags RwaFramework
 *
 * Env:
 *   FEE_TOKEN_ADDRESS — USDC on Arbitrum; deploys MockFeeToken if unset
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;
    const { ethers } = await network.connect();
    const deployerAddr = deployer as `0x${string}`;
    const deployerSigner = await ethers.getSigner(deployerAddr);

    // ---------------------------------------------------------------------
    // ONCHAINID (ERC-734/735) identity stack
    // ---------------------------------------------------------------------
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployerSigner,
    ).deploy(deployerAddr, true);
    await identityImplementation.waitForDeployment();
    const identityImplementationAddr = await identityImplementation.getAddress();
    console.log("ONCHAINID Identity implementation:", identityImplementationAddr);

    const implementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployerSigner,
    ).deploy(identityImplementationAddr);
    await implementationAuthority.waitForDeployment();
    const implementationAuthorityAddr = await implementationAuthority.getAddress();
    console.log("ONCHAINID ImplementationAuthority:", implementationAuthorityAddr);

    const onchainIdFactory = await new ethers.ContractFactory(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      deployerSigner,
    ).deploy(implementationAuthorityAddr);
    await onchainIdFactory.waitForDeployment();
    const onchainIdFactoryAddr = await onchainIdFactory.getAddress();
    console.log("ONCHAINID IdFactory:", onchainIdFactoryAddr);

    // Persist ONCHAINID deployments so generateTsAbis can generate frontend contract info
    await env.save("IdentityImplementation", {
      address: identityImplementationAddr as `0x${string}`,
      abi: OnchainID.contracts.Identity.abi,
      bytecode: OnchainID.contracts.Identity.bytecode,
      argsData: "0x",
      metadata: "{}",
    });
    await env.save("ImplementationAuthority", {
      address: implementationAuthorityAddr as `0x${string}`,
      abi: OnchainID.contracts.ImplementationAuthority.abi,
      bytecode: OnchainID.contracts.ImplementationAuthority.bytecode,
      argsData: "0x",
      metadata: "{}",
    });
    await env.save("IdFactory", {
      address: onchainIdFactoryAddr as `0x${string}`,
      abi: OnchainID.contracts.Factory.abi,
      bytecode: OnchainID.contracts.Factory.bytecode,
      argsData: "0x",
      metadata: "{}",
    });

    let feeTokenAddress = process.env.FEE_TOKEN_ADDRESS;
    if (!feeTokenAddress) {
      const feeToken = await env.deploy("MockFeeToken", {
        account: deployer,
        artifact: artifacts.MockFeeToken,
        args: [],
      });
      feeTokenAddress = feeToken.address;
      console.log("MockFeeToken:", feeTokenAddress);
    } else {
      console.log("Using FEE_TOKEN_ADDRESS:", feeTokenAddress);
    }
    const feeTokenAddr = feeTokenAddress as `0x${string}`;

    const infoDesk = await env.deploy("InfoDesk", {
      account: deployer,
      artifact: artifacts.InfoDesk,
      args: [deployer],
    });
    console.log("InfoDesk:", infoDesk.address);

    const infoDeskContract = await ethers.getContractAt("InfoDesk", infoDesk.address);
    await infoDeskContract.setContract(0, feeTokenAddr);
    await infoDeskContract.setAccount(0, deployer);
    await infoDeskContract.setAccount(1, deployer);
    await infoDeskContract.setAccount(2, deployer);
    await infoDeskContract.setValue(3, ethers.parseEther("0.01"));

    const kycIssuer = await deployOidClaimIssuer(deployerSigner, deployerSigner);
    const kycIssuerAddr = await kycIssuer.getAddress();
    console.log("ClaimIssuer ONCHAINID (KYC):", kycIssuerAddr);
    await env.save("ClaimIssuer", {
      address: kycIssuerAddr as `0x${string}`,
      abi: OnchainID.contracts.ClaimIssuer.abi,
      bytecode: OnchainID.contracts.ClaimIssuer.bytecode,
      argsData: "0x",
      metadata: "{}",
    });

    console.log("\nDeploying ERC-3643 T-REX suite...");
    const trex = await deployTrexSuite(deployerSigner, onchainIdFactoryAddr);
    const trexFactoryAddr = await trex.trexFactory.getAddress();
    const trexGatewayAddr = await trex.trexGateway.getAddress();
    const trexIaAddr = await trex.trexImplementationAuthority.getAddress();
    const oidFactoryAddr = onchainIdFactoryAddr;
    console.log("TREXImplementationAuthority:", trexIaAddr);
    console.log("TREXFactory:", trexFactoryAddr);
    console.log("TREXGateway:", trexGatewayAddr);
    console.log("ONCHAINID IdFactory:", oidFactoryAddr);

    const { impl: feeModuleImpl, proxy: feeModuleProxy } = await deployFeeModuleProxy(
      deployerSigner,
      infoDesk.address,
    );
    const feeModuleImplAddr = await feeModuleImpl.getAddress();
    const feeModuleProxyAddr = await feeModuleProxy.getAddress();
    console.log("NativeTransferFeeModule impl:", feeModuleImplAddr);
    console.log("NativeTransferFeeModule proxy:", feeModuleProxyAddr);

    await infoDeskContract.setImplementation(4, feeModuleImplAddr);

    const rwaNft = await env.deploy("ArbRwaNft", {
      account: deployer,
      artifact: artifacts.ArbRwaNft,
      args: [deployerAddr, infoDesk.address, feeTokenAddr, onchainIdFactoryAddr, kycIssuerAddr as `0x${string}`],
    });
    console.log("ArbRwaNft:", rwaNft.address);
    await infoDeskContract.setContract(1, rwaNft.address);

    const vaultFactory = await env.deploy("ArbVaultFactory", {
      account: deployer,
      artifact: artifacts.ArbVaultFactory,
      args: [deployerAddr, infoDesk.address, trexFactoryAddr as `0x${string}`],
    });
    console.log("ArbVaultFactory:", vaultFactory.address);

    await trex.trexFactory.connect(deployerSigner).transferOwnership(vaultFactory.address);
    console.log("TREXFactory ownership → ArbVaultFactory");

    const onchainIdFactoryContract = new ethers.Contract(
      onchainIdFactoryAddr,
      OnchainID.contracts.Factory.abi,
      deployerSigner,
    );
    await onchainIdFactoryContract.addTokenFactory(vaultFactory.address);

    // Fund default burner wallets (accounts 1–4) for manual UI testing
    if (!process.env.FEE_TOKEN_ADDRESS) {
      const fee = await ethers.getContractAt("MockFeeToken", feeTokenAddress);
      const signers = await ethers.getSigners();
      for (let i = 1; i <= 4 && i < signers.length; i++) {
        await fee.mint(signers[i].address, ethers.parseEther("10000"));
      }
    }

    console.log("\nRWA framework deployed");
  },
  {
    tags: ["RwaFramework"],
  },
);
