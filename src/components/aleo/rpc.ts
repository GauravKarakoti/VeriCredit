import { JSONRPCClient } from 'json-rpc-2.0';
import { VERICREDIT_PROGRAM_ID, CURRENT_RPC_URL } from '@/types';

export const CREDITS_PROGRAM_ID = 'credits.aleo';

// Create the JSON-RPC client
export const client = getClient(CURRENT_RPC_URL);

// ==========================================
// Generic Mapping Fetchers
// ==========================================

export async function fetchMappingValueString(
  mappingName: string,
  key: string
): Promise<string> {
  try {
    const result = await client.request('getMappingValue', {
      programId: VERICREDIT_PROGRAM_ID,
      mappingName,
      key,
    });
    return result.value; 
  } catch (error) {
    console.error(`Failed to fetch mapping ${mappingName} with key ${key}:`, error);
    throw error;
  }
}

export async function fetchMappingValueRaw(
  mappingName: string,
  key: string
): Promise<string> {
  try {
    const result = await client.request("getMappingValue", {
      program_id: VERICREDIT_PROGRAM_ID,
      mapping_name: mappingName,
      key,
    });

    if (!result) {
      throw new Error(
        `No result returned for mapping "${mappingName}" and key "${key}"`
      );
    }
    return result;
  } catch (error) {
    console.error(`Failed to fetch mapping "${mappingName}" with key "${key}":`, error);
    throw error;
  }
}

// ==========================================
// VeriCredit Specific Mappings
// ==========================================

/**
 * Fetch the nullifier for a given address to check if a credit score is initialized.
 */
export async function fetchCreditScoreNullifier(address: string): Promise<string | null> {
  try {
    return await fetchMappingValueRaw('credit_scores', address);
  } catch (error) {
    return null; // Return null if not found
  }
}

/**
 * Fetch an active loan request's terms hash for a given borrower address.
 */
export async function fetchLoanRequest(borrowerAddress: string): Promise<string | null> {
  try {
    return await fetchMappingValueRaw('loan_requests', borrowerAddress);
  } catch (error) {
    return null;
  }
}

/**
 * Fetch the borrower address for an active loan by its loan_id (field).
 */
export async function fetchActiveLoan(loanId: string): Promise<string | null> {
  try {
    return await fetchMappingValueRaw('active_loans', loanId);
  } catch (error) {
    return null;
  }
}

// ==========================================
// VeriCredit Transitions
// ==========================================

/**
 * 1. Initialize Credit Score
 */
export async function initializeCreditScore(
  initialScore: number
): Promise<string> {
  const inputs = [`${initialScore}u32`];
  
  const result = await client.request('executeTransition', {
    programId: VERICREDIT_PROGRAM_ID,
    functionName: 'initialize_credit_score',
    inputs,
  });
  
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * 2. Create Loan Request
 */
export async function createLoanRequest(
  minAmount: number,
  maxAmount: number,
  minInterest: number,
  maxInterest: number,
  durationDays: number,
  creditScoreRecord: string,
  scoreProof: string
): Promise<string> {
  const inputs = [
    `${minAmount}u64`,
    `${maxAmount}u64`,
    `${minInterest}u8`,
    `${maxInterest}u8`,
    `${durationDays}u16`,
    creditScoreRecord, // Passed as a complete record string
    scoreProof         // Passed as a field string
  ];

  const result = await client.request('executeTransition', {
    programId: VERICREDIT_PROGRAM_ID,
    functionName: 'create_loan_request',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * 3. Fund Loan
 */
export async function fundLoan(
  borrowerAddress: string,
  loanRequestRecord: string,
  fundingAmount: number,
  interestRate: number,
  durationDays: number,
  feeRecord: string
): Promise<string> {
  const inputs = [
    borrowerAddress,
    loanRequestRecord,
    `${fundingAmount}u64`,
    `${interestRate}u8`,
    `${durationDays}u16`,
    feeRecord
  ];

  const result = await client.request('executeTransition', {
    programId: VERICREDIT_PROGRAM_ID,
    functionName: 'fund_loan',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

// ==========================================
// Generic Utilities
// ==========================================

/**
 * Utility to fetch program transactions
 */
export async function getProgramTransactions(
  functionName: string,
  page = 0,
  maxTransactions = 100
) {
  return client.request('aleoTransactionsForProgram', {
    programId: VERICREDIT_PROGRAM_ID,
    functionName,
    page,
    maxTransactions,
  });
}

/**
 * Transfer credits publicly between two accounts.
 */
export async function transferPublic(
  recipient: string,
  amount: string
): Promise<string> {
  const inputs = [
    `${recipient}.public`, // Recipient's public address
    `${amount}u64`,    // Amount to transfer
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_public',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * Transfer credits privately between two accounts.
 */
export async function transferPrivate(
  senderRecord: string,
  recipient: string,
  amount: string
): Promise<{ recipientRecord: string; senderRecord: string }> {
  const inputs = [
    `${senderRecord}`,         // r0: credits.record
    `${recipient}.private`,    // r1: address.private
    `${amount}u64.private`,     // r2: u64.private
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_private',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }

  return {
    recipientRecord: result.outputs[0],
    senderRecord: result.outputs[1],
  };
}

/**
 * Wait for Transaction Finalization
 */
export async function waitForTransactionToFinalize(
  transactionId: string
): Promise<boolean> {
  const maxRetries = 30;
  const delay = 1000; // 1 second
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const status = await client.request('getTransactionStatus', { id: transactionId });
      if (status === 'finalized') {
        return true;
      }
    } catch (error) {
      console.error(`Failed to get transaction status: ${error}`);
    }
    retries++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return false; 
}

/**
 * Utility to Create JSON-RPC Client
 */
export function getClient(apiUrl: string): JSONRPCClient {
  const client: JSONRPCClient = new JSONRPCClient((jsonRPCRequest: any) =>
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(jsonRPCRequest),
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((jsonRPCResponse) =>
          client.receive(jsonRPCResponse)
        );
      }
      throw new Error(response.statusText);
    })
  );
  return client;
}

/**
 * Get Verifying Key for a Function
 */
async function getDeploymentTransaction(programId: string): Promise<any> {
  const response = await fetch(`${CURRENT_RPC_URL}find/transactionID/deployment/${programId}`);
  const deployTxId = await response.json();
  const txResponse = await fetch(`${CURRENT_RPC_URL}transaction/${deployTxId}`);
  const tx = await txResponse.json();
  return tx;
}

export async function getVerifyingKey(
  programId: string,
  functionName: string
): Promise<string> {
  const deploymentTx = await getDeploymentTransaction(programId);

  const allVerifyingKeys = deploymentTx.deployment.verifying_keys;
  const verifyingKey = allVerifyingKeys.filter((vk: any) => vk[0] === functionName)[0][1][0];
  return verifyingKey;
}

export async function getProgram(programId: string, apiUrl: string): Promise<string> {
  const client = getClient(apiUrl);
  const program = await client.request('program', {
    id: programId
  });
  return program;
}