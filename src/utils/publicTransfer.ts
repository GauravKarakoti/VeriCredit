import { TransactionOptions } from '@provablehq/aleo-types';
import { getFeeForFunction } from '@/utils/feeCalculator';

export const TOKEN_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';
export const TRANSFER_PUBLIC_FUNCTION = 'transfer_public';

/**
 * Executes a public transfer of credits to a target address.
 *
 * @param wallet - The wallet adapter instance (can be LeoWalletAdapter or ShieldWalletAdapter).
 * @param recipientAddress - The address to receive the public transfer.
 * @param amount - The amount (in microcredits) to be transferred.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted public transfer.
 */
export async function publicTransfer(
  wallet: any,
  recipientAddress: string,
  amount: number,
  setTxStatus: (status: string | null) => void
): Promise<string> {
  // Format the transfer amount (e.g. if amount = 5000, then "5000000u64")
  const transferAmountString = `${amount}000000u64`;

  setTxStatus('Initiating public transfer...');

  // 1. Create the transaction input
  const transferInput = [recipientAddress, transferAmountString];
  
  const fee = getFeeForFunction(TRANSFER_PUBLIC_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  const transaction: TransactionOptions = {
    program: TOKEN_PROGRAM_ID,
    function: TRANSFER_PUBLIC_FUNCTION,
    inputs: transferInput as string[],
    fee: fee,
  };

  // 2. Submit the transaction
  setTxStatus('Submitting public transfer transaction...');
  const result = await wallet.executeTransaction(transaction);
  const txId = result.transactionId || result;
  
  setTxStatus(`Public transfer submitted: ${txId}`);

  // 3. Poll for finalization
  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const statusResponse = await wallet.transactionStatus(txId);
    const status = String(statusResponse); 

    setTxStatus(`Attempt ${attempt + 1}: ${status}`);

    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    // Wait 2 seconds before checking again
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    setTxStatus('Public transfer not finalized in time.');
    throw new Error('Public transfer not finalized in time.');
  }

  setTxStatus('Public transfer finalized successfully.');
  
  // Note: If VeriCredit relies on a backend database to track standard public payments
  // you can make your fetch() call here to update your DB state.
  
  return txId;
}