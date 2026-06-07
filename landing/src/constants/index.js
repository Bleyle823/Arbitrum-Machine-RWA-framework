import {
  benefitIcon1,
  benefitIcon2,
  benefitIcon3,
  benefitIcon4,
  benefitImage2,
  chromecast,
  disc02,
  file02,
  homeSmile,
  plusSquare,
  recording01,
  recording03,
  roadmap1,
  roadmap2,
  roadmap3,
  roadmap4,
  searchMd,
  sliders04,
  twitter,
} from "../assets";

const REPO =
  "https://github.com/Bleyle823/Arbitrum-Machine-RWA-framework/tree/develop";
const DOCS = "https://arbitrum-machine-rwa-docs.vercel.app";
const SCAFFOLD = "https://arbitrum-machine-rwa-scaffold.vercel.app";

export const siteConfig = {
  name: "Arbitrum Machine RWA",
  tagline: "Compliant machine tokenization on Arbitrum",
  repoUrl: REPO,
  docsUrl: DOCS,
  scaffoldUrl: SCAFFOLD,
  rwaAppUrl: `${SCAFFOLD}/rwa`,
  debugAppUrl: `${SCAFFOLD}/debug`,
  sdkPackage: "arbitrum-machine-rwa-sdk",
};

export const navigation = [
  { id: "0", title: "Overview", url: "#hero" },
  { id: "1", title: "Modules", url: "#features" },
  { id: "2", title: "Pipeline", url: "#pipeline" },
  { id: "3", title: "Guides", url: "#how-to-use" },
  { id: "4", title: "Documentation", url: "#docs" },
  { id: "5", title: "Roadmap", url: "#roadmap" },
];

export const heroIcons = [homeSmile, file02, searchMd, plusSquare];

export const notificationImages = [benefitImage2, benefitImage2, benefitImage2];

export const companyLogos = [
  "ONCHAINID",
  "ERC-3643",
  "ERC-721",
  "Arbitrum",
  "T-REX",
];

export const brainwaveServices = [
  "ONCHAINID identity + KYC claims",
  "Machine & Contract NFT collateral",
  "ERC-3643 vault mint & transfer",
];

export const brainwaveServicesIcons = [
  recording03,
  recording01,
  disc02,
  chromecast,
  sliders04,
];

export const roadmap = [
  {
    id: "0",
    title: "Framework & SDK",
    text: "Modular TypeScript SDK covering onchainid, mnft, cnft, vault, and rwanft with bundled Sepolia manifests.",
    date: "2025",
    status: "done",
    imageUrl: roadmap1,
    colorful: true,
  },
  {
    id: "1",
    title: "Arbitrum Sepolia reference deploy",
    text: "Hardhat deploy, bootstrap demo state, live Scaffold-ETH /rwa UI, hosted Mintlify docs, and verify-workflow checks.",
    date: "2026",
    status: "done",
    imageUrl: roadmap2,
  },
  {
    id: "2",
    title: "Robinhood Chain Testnet",
    text: "Framework contracts live on chain 46630 with deploy/bootstrap scripts and network config in the monorepo.",
    date: "2026",
    status: "done",
    imageUrl: roadmap3,
  },
  {
    id: "3",
    title: "Arbitrum One mainnet",
    text: "Production contract addresses and audited deployments for integrators. Docs and demo UI already live on testnet.",
    date: "Next",
    status: "progress",
    imageUrl: roadmap4,
  },
];

export const collabText =
  "Identity, collateral, fractional shares, and yield — one compliant pipeline from machine registration to investor payouts on Arbitrum.";

export const collabContent = [
  {
    id: "0",
    title: "Compliance by design",
    text: collabText,
  },
  { id: "1", title: "ONCHAINID + ERC-3643 T-REX" },
  { id: "2", title: "Modular SDK & deploy tooling" },
];

export const collabApps = [
  { id: "0", title: "Identity", icon: file02, width: 26, height: 36 },
  { id: "1", title: "Machine NFT", icon: homeSmile, width: 34, height: 36 },
  { id: "2", title: "Contract NFT", icon: plusSquare, width: 36, height: 28 },
  { id: "3", title: "Vault", icon: searchMd, width: 34, height: 35 },
  { id: "4", title: "ERC-3643", icon: disc02, width: 34, height: 34 },
  { id: "5", title: "Yield", icon: sliders04, width: 34, height: 34 },
  { id: "6", title: "RWA NFT", icon: recording01, width: 26, height: 34 },
  { id: "7", title: "Arbitrum", icon: chromecast, width: 38, height: 32 },
];

export const pricing = [
  {
    id: "0",
    title: "SDK Quickstart",
    description:
      "Install arbitrum-machine-rwa-sdk, connect to Arbitrum Sepolia, and verify bootstrap state in minutes.",
    href: `${DOCS}/quickstart`,
    cta: "Open quickstart",
    features: [
      "npm install arbitrum-machine-rwa-sdk + ethers",
      "Read-only checks against bundled Sepolia manifest",
      "TypeScript examples for isVerified and vault state",
    ],
  },
  {
    id: "1",
    title: "Smart contracts",
    description:
      "Deploy, bootstrap, and verify the RWA framework on-chain without the TypeScript SDK.",
    href: `${DOCS}/smart-contracts/guide`,
    cta: "Contract guide",
    highlight: true,
    features: [
      "Local Hardhat tests and full-flow demo script",
      "Arbitrum Sepolia & Robinhood Chain Testnet deploy",
      "Bootstrap vault, identities, and demo NFTs",
    ],
  },
  {
    id: "2",
    title: "End-to-end workflow",
    description:
      "Integrator flow from identity creation through vault mint, transfer, and yield on a live testnet.",
    href: `${DOCS}/workflows/common-flow`,
    cta: "Common flow",
    features: [
      "ONCHAINID → Machine NFT → Contract NFT → Arb Vault",
      "ERC-3643 mint, compliant transfer, yield claim",
      "Manual testing via SDK or the live Scaffold-ETH demo",
    ],
  },
];

export const benefits = [
  {
    id: "0",
    title: "ONCHAINID identity",
    text: "Link wallets to verified on-chain identities. KYC claims (topic 666) gate vault participation and transfers.",
    backgroundUrl: "./src/assets/benefits/card-1.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage2,
    href: `${DOCS}/sdk-reference/identity/create-identity`,
  },
  {
    id: "1",
    title: "Machine NFT",
    text: "Register physical machines as ERC-721 tokens with embedded DID documents and on-chain metadata.",
    backgroundUrl: "./src/assets/benefits/card-2.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
    light: true,
    href: `${DOCS}/sdk-reference/mnft/register-machine`,
  },
  {
    id: "2",
    title: "Contract NFT",
    text: "Encode multi-party agreements as collateral. Counterparties sign until the contract NFT is complete.",
    backgroundUrl: "./src/assets/benefits/card-3.svg",
    iconUrl: benefitIcon3,
    imageUrl: benefitImage2,
    href: `${DOCS}/sdk-reference/cnft/create-contract`,
  },
  {
    id: "3",
    title: "Arb Vault",
    text: "Lock Machine and Contract NFTs in a vault. Mint fractional ERC-3643 security tokens to verified investors.",
    backgroundUrl: "./src/assets/benefits/card-4.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitImage2,
    light: true,
    href: `${DOCS}/sdk-reference/vault/deposit-and-mint`,
  },
  {
    id: "4",
    title: "Compliant transfers",
    text: "T-REX Identity Registry enforces KYC on every transfer. Native fee module handles compliance costs.",
    backgroundUrl: "./src/assets/benefits/card-5.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage2,
    href: `${DOCS}/sdk-reference/vault/transfer`,
  },
  {
    id: "5",
    title: "Yield distribution",
    text: "Deposit machine revenue into the reward distributor. Token holders claim yield pro-rata to ownership.",
    backgroundUrl: "./src/assets/benefits/card-6.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
    href: `${DOCS}/sdk-reference/vault/claim-yield`,
  },
];

export const socials = [
  {
    id: "0",
    title: "GitHub",
    iconUrl: file02,
    url: "https://github.com/Bleyle823/Arbitrum-Machine-RWA-framework",
  },
  {
    id: "1",
    title: "Twitter",
    iconUrl: twitter,
    url: "https://twitter.com",
  },
];
