import { TransactionOptions } from '@provablehq/aleo-types'; 
import { getFeeForFunction } from '@/utils/feeCalculator';

export const TOKEN_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';
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
  // Note: Check the decimals for your specific token. 
  // If USDCx uses 6 decimals, appending "000000u64" works. If 18, adjust accordingly.
  const transferAmountString = `${amount}000000u64`; 
  
  setTxStatus('Fetching your private records...');
  // 1. Request records for the specific token program
  const allRecords = await wallet.requestRecords(TOKEN_PROGRAM_ID, true);
  if (!allRecords || allRecords.length === 0) {
    throw new Error('No token records found. You may need to fund your wallet.');
  }

  // 2. Filter using the correct property (usually 'amount' for custom tokens instead of 'microcredits')
  const privateRecords = allRecords.filter(
    (record: any) => record.data?.amount && record.data.amount.endsWith('u64.private')
  );
  
  const unspentRecords = privateRecords.filter((record: any) => record.spent === false);

  if (unspentRecords.length === 0) {
    throw new Error('No unspent private records available.');
  }

  // 3. Extract the value from the 'amount' string
  const extractValue = (valueStr: string): number => {
    const match = valueStr.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const neededAmount = extractValue(transferAmountString);

  const transferCandidates = unspentRecords.filter((record: any) => {
    // Update to extract from record.data.amount
    const recordValue = extractValue(record.data.amount);
    return recordValue >= neededAmount;
  });

  if (transferCandidates.length === 0) {
    throw new Error('No single record can cover the required transfer amount.');
  }

  const chosenRecord = transferCandidates[0];

  const txInputs = [
    chosenRecord,            
    recipientAddress,        
    transferAmountString,    
  ];

  const fee = getFeeForFunction(TRANSFER_PRIVATE_FUNCTION);

  const transaction: TransactionOptions = {
    program: TOKEN_PROGRAM_ID, // <-- Update here
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