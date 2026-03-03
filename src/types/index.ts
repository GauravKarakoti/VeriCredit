import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Network } from '@provablehq/aleo-types'; 

export const CURRENT_NETWORK: Network = Network.TESTNET;
export const CURRENT_RPC_URL = "https://api.explorer.provable.com/v2";

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  authorization?: boolean;
  getLayout?: (page: ReactElement) => ReactNode;
};

// VeriCredit Specific Types
export type CreditScore = {
  owner: string;
  score_commitment: string;
  history_root: string;
  nullifier: string;
};

export type LoanRequest = {
  owner: string;
  encrypted_terms: string;
  score_proof: string;
  nonce: string;
};

export const VERICREDIT_PROGRAM_ID = 'vericredit.aleo';