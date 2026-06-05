export function GasRetryHint() {
  return (
    <p className="text-xs opacity-70">
      If MetaMask shows a gas error (max fee below base fee), retry or raise max fee slightly (~0.05 gwei on Arbitrum
      Sepolia).
    </p>
  );
}
