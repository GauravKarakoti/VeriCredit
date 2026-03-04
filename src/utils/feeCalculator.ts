export interface FeeMapping {
  [functionName: string]: number; // fee in credits
}

// Hard-coded fee values in credits
export const defaultFeeValues: FeeMapping = {
  transfer_public: 0.04406,
  transfer_private: 0.04406,
  
  // ADD THIS LINE:
  initialize_credit_score: 0.05, // You can adjust this fee based on network requirements
};

/**
 * Returns the fee for a given function in micro credits.
 * (1 credit = 1,000,000 micro credits)
 */
export function getFeeForFunction(functionName: string): number {
  const feeInCredits = defaultFeeValues[functionName];
  if (feeInCredits === undefined) {
    throw new Error(`No fee value found for function: ${functionName}`);
  }
  return feeInCredits * 1_000_000; // convert credits to micro credits
}