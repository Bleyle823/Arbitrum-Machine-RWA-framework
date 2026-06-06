const { RWA, Chain } = require("../../dist/index.cjs");

if (typeof RWA === "function" && Chain.ARBITRUM_SEPOLIA === 421614) {
  console.log("ok-cjs");
} else {
  console.log("bad-cjs");
}
