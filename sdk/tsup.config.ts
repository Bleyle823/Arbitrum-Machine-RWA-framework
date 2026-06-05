import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    abis: "src/abis.ts",
    "addresses/index": "src/addresses/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["ethers", "viem", "@onchain-id/solidity"],
});
