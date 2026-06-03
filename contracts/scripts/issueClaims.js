/**
 * Issue KYC and machine-role claims after deploy.
 *
 *   npx hardhat run scripts/issueClaims.js --network localhost
 *
 * Env (optional if deployment JSON exists):
 *   CLAIM_ISSUER_ADDRESS — from deploy log
 *   ID_FACTORY_ADDRESS, ARB_RWA_NFT_ADDRESS — overrides
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const OnchainID = require("@onchain-id/solidity");
const {
  addClaim,
  CT_KYC_APPROVED,
  CT_MNFT_ISSUER,
  CT_MNFT_REGULATOR,
  kycData,
  roleData,
} = require("./lib/claims");

function loadDeployment() {
  const chainId = hre.network.config.chainId;
  const file = path.join(__dirname, "..", "deployments", `deployment-${chainId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const deployment = loadDeployment();

  const claimIssuerAddress = process.env.CLAIM_ISSUER_ADDRESS ?? deployment?.onchainid?.claimIssuer;
  const idFactoryAddr = process.env.ID_FACTORY_ADDRESS ?? deployment?.onchainid?.idFactory;
  const rwaNftAddr = process.env.ARB_RWA_NFT_ADDRESS ?? deployment?.nft?.arbRwaNft;

  if (!claimIssuerAddress) {
    throw new Error("Set CLAIM_ISSUER_ADDRESS or run deploy.js first (writes deployments/deployment-<chainId>.json).");
  }
  if (!idFactoryAddr || !rwaNftAddr) {
    throw new Error("Missing IdFactory / ArbRwaNft — run deploy.js first or set ID_FACTORY_ADDRESS and ARB_RWA_NFT_ADDRESS.");
  }

  const [admin, alice, bob, charlie] = await hre.ethers.getSigners();
  const idFactory = new hre.ethers.Contract(idFactoryAddr, OnchainID.contracts.Factory.abi, admin);

  console.log("ClaimIssuer:", claimIssuerAddress);
  console.log("IdFactory:", idFactoryAddr);
  console.log("ArbRwaNft:", rwaNftAddr);
  console.log("Claim issuer signer (local deploy):", admin.address);

  for (const [user, salt, name] of [
    [alice, "alice", "Alice"],
    [bob, "bob", "Bob"],
    [charlie, "charlie", "Charlie"],
  ]) {
    let identity = await idFactory.getIdentity(user.address);
    if (identity === hre.ethers.ZeroAddress) {
      await idFactory.createIdentity(user.address, salt);
      identity = await idFactory.getIdentity(user.address);
    }
    await addClaim(
      user,
      identity,
      admin,
      claimIssuerAddress,
      CT_KYC_APPROVED,
      kycData(name, "Test", "1990-01-01", "Berlin")
    );
    console.log(`KYC claim → ${name} identity ${identity}`);
  }

  let issuerIdentity = await idFactory.getIdentity(admin.address);
  if (issuerIdentity === hre.ethers.ZeroAddress) {
    await idFactory.createIdentity(admin.address, "issuer");
    issuerIdentity = await idFactory.getIdentity(admin.address);
  }
  await addClaim(admin, issuerIdentity, admin, claimIssuerAddress, CT_MNFT_ISSUER, roleData("machine issuer"));
  await addClaim(admin, issuerIdentity, admin, claimIssuerAddress, CT_MNFT_REGULATOR, roleData("machine regulator"));
  console.log("Machine issuer + regulator claims for", admin.address);

  console.log("\nDone. Next: ArbRwaNft.addMachineRegulator(admin) + addMachineIssuer(admin).");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
