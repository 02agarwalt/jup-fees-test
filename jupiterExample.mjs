/*
 * Jup example code taken directly from
 * https://docs.jup.ag/jupiter-api/swap-api-for-solana
 */
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import fetch from "cross-fetch";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";

import * as dotenv from "dotenv";
dotenv.config();

// The GenesysGo RPC endpoint is currently free to use now.
// They may charge in the future. It is recommended that
// you are using your own RPC endpoint.
const connection = new Connection("https://ssc-dao.genesysgo.net");
const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
);
// swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
const { data } = await (
  await fetch(
    "https://quote-api.jup.ag/v3/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=5000000&slippageBps=50&feeBps=50"
  )
).json();
const routes = data;
console.log(JSON.stringify(routes[0]));
// get serialized transactions for the swap
const transactions = await (
  await fetch("https://quote-api.jup.ag/v3/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // route from /quote api
      route: routes[0],
      // user public key to be used for the swap
      userPublicKey: wallet.publicKey.toString(),
      // auto wrap and unwrap SOL. default is true
      wrapUnwrapSOL: true,
      // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
      // This is the ATA account for the output token where the fee will be sent to. If you are swapping from SOL->USDC then this would be the USDC ATA you want to collect the fee.
      feeAccount: "8t6VzhJvQVPAWAxPjVsF9JNvHvVv9f3Pj1MyqfreiPkK",
    }),
  })
).json();

const { setupTransaction, swapTransaction, cleanupTransaction } = transactions;
// Execute the transactions
for (let serializedTransaction of [
  setupTransaction,
  swapTransaction,
  cleanupTransaction,
].filter(Boolean)) {
  // get transaction object from serialized transaction
  const transaction = Transaction.from(
    Buffer.from(serializedTransaction, "base64")
  );
  // perform the swap
  const txid = await connection.sendTransaction(transaction, [wallet.payer], {
    skipPreflight: true,
  });
  await connection.confirmTransaction(txid);
  console.log(`https://solscan.io/tx/${txid}`);
}
