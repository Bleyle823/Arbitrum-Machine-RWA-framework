// ESM runtime import
import { RWA, Chain } from "../../dist/index.js";

if (typeof RWA === "function" && Chain.ARBITRUM_SEPOLIA === 421614) {
  console.log("ok-esm");
} else {
  console.log("bad-esm");
}
