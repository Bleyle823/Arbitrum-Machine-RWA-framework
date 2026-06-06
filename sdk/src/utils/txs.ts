import type { Signer, TransactionRequest } from "ethers";

export async function waitForTx(signer: Signer, tx: TransactionRequest) {
  const sent = await signer.sendTransaction(tx);
  const receipt = await sent.wait();
  if (!receipt) throw new Error("Transaction receipt missing");
  return receipt;
}
