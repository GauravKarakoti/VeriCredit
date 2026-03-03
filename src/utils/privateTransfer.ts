import { TransactionOptions } from '@provablehq/aleo-types'; 
import { getFeeForFunction } from '@/utils/feeCalculator';

export const CREDITS_PROGRAM_ID = 'credits.aleo';
export const TRANSFER_PRIVATE_FUNCTION = 'transfer_private';

/**
 * Executes a private transfer of credits to a target address (e.g., funding a loan).
 *
 * @param wallet - The wallet adapter instance (can be LeoWalletAdapter or ShieldWalletAdapter).
 * @param recipientAddress - The address to receive the funds (e.g., the borrower).
 * @param amount - The amount (in microcredits) to be transferred.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted private transfer.
 */
export async function privateTransfer(
  wallet: any,
  recipientAddress: string,
  amount: number,
  setTxStatus: (status: string | null) => void
): Promise<string> {
  // Format the transfer amount (e.g., if amount = 5000, then "5000000u64.private")
  // Note: For standard credits.aleo transfers, the inputs don't strictly require the .private 
  // suffix in the JS wrapper unless using direct RPC, but we format the value properly.
  const transferAmountString = `${amount}000000u64`; 
  
  setTxStatus('Fetching your private records...');
  const allRecords = await wallet.requestRecords(CREDITS_PROGRAM_ID, true);
  if (!allRecords || allRecords.length === 0) {
    throw new Error('No credits records found. You may need to fund your wallet.');
  }

  // 1. Filter private + unspent records
  const privateRecords = allRecords.filter(
    (record: any) => record.data?.microcredits && record.data.microcredits.endsWith('u64.private')
  );
  const unspentRecords = privateRecords.filter((record: any) => record.spent === false);

  if (unspentRecords.length === 0) {
    throw new Error('No unspent private records available.');
  }

  // 2. Find one record that can cover the transfer amount
  const extractValue = (valueStr: string): number => {
    const match = valueStr.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const neededAmount = extractValue(transferAmountString);

  const transferCandidates = unspentRecords.filter((record: any) => {
    const recordValue = extractValue(record.data.microcredits);
    return recordValue >= neededAmount;
  });

  if (transferCandidates.length === 0) {
    throw new Error('No single record can cover the required transfer amount. You may need to consolidate records.');
  }

  const chosenRecord = transferCandidates[0];
  console.log('Chosen record for funding:', chosenRecord);

  // 3. Create transaction inputs
  const txInputs = [
    chosenRecord,            // r0: The record we’ll spend
    recipientAddress,        // r1: The borrower's address receiving the funds
    transferAmountString,    // r2: The amount
  ];

  console.log('Private transfer inputs:', txInputs);

  const fee = getFeeForFunction(TRANSFER_PRIVATE_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  const transaction: TransactionOptions = {
    program: CREDITS_PROGRAM_ID,
    function: TRANSFER_PRIVATE_FUNCTION,
    inputs: txInputs as string[], 
    fee: fee,
  };

  // 4. Submit the transaction
  setTxStatus('Submitting private transfer transaction...');
  const result = await wallet.executeTransaction(transaction);
  const txId = result.transactionId || result;
  
  setTxStatus(`Private transfer submitted: ${txId}`);

  // 5. Poll for completion/finalization
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
    setTxStatus('Private transfer not finalized in time.');
    throw new Error('Private transfer not finalized in time.');
  } else {
    setTxStatus('Private transfer finalized successfully.');
  }

  return txId;
}