import React, { useState, useEffect } from 'react';
import { NextSeo } from 'next-seo';
import type { NextPageWithLayout } from '@/types';
import DashboardLayout from '@/layouts/dashboard/_dashboard';
import { AleoProvider } from '@/aleo/provider';
import { initializeWasm } from '@provablehq/sdk';
import Button from '@/components/ui/button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { VERICREDIT_PROGRAM_ID } from '@/types';
import { getFeeForFunction } from '@/utils/feeCalculator';

const DashboardPage: NextPageWithLayout = () => {
  const [provider, setProvider] = useState<AleoProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [creditScore, setCreditScore] = useState<number>(720);
  
  // FIX: Use 'address' and 'executeTransaction' instead of 'publicKey' and 'requestTransaction'
  const { address, executeTransaction } = useWallet();
  
  // Initialize WASM and provider on mount
  useEffect(() => {
    const init = async () => {
      await initializeWasm();
      
      const demoKey = process.env.PRIVATE_KEY!;
      const aleoProvider = new AleoProvider(demoKey);
      setProvider(aleoProvider);
    };
    
    init();
  }, []);
  
  const initializeCreditScore = async () => {
    // FIX: check 'address' instead
    if (!address) return alert("Connect wallet first");
    setLoading(true);
    
    try {
      const transaction: TransactionOptions = {
        program: VERICREDIT_PROGRAM_ID,
        function: 'initialize_credit_score',
        inputs: [`${creditScore}u32`],
        fee: getFeeForFunction('initialize_credit_score'), 
      };
      
      // FIX: Call executeTransaction which returns { transactionId: string } | undefined
      const txResult = await executeTransaction(transaction);
      
      if (txResult?.transactionId) {
        setResult(`Transaction submitted: ${txResult.transactionId}`);
      } else {
        setResult('Transaction was canceled or failed.');
      }
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <NextSeo title="Dashboard | VeriCredit" />
      
      <div className="flex justify-center px-4">
        <div className="w-full max-w-2xl font-body text-center">
            <h1 className="mb-8 text-3xl font-bold text-base-content">
            VeriCredit - Private Lending
            </h1>
            
            <div className="card bg-base-200 shadow-card p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-base-content">
                Initialize Credit Score
            </h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <input
                type="number"
                className="input input-bordered w-full sm:max-w-xs"
                value={creditScore}
                onChange={(e) => setCreditScore(parseInt(e.target.value))}
                min="300"
                max="850"
                />
                <Button 
                onClick={initializeCreditScore} 
                isLoading={loading}
                // FIX: removed !provider dependency since we are using the wallet extension
                disabled={loading}
                className="w-full sm:w-auto"
                >
                {loading ? 'Processing...' : 'Initialize Score'}
                </Button>
            </div>
            </div>
            
            {result && (
            <div className="bg-info/10 border-l-4 border-info p-5 rounded-r-md mt-4">
                <h3 className="font-semibold text-info-content mb-2">Result:</h3>
                <pre className="whitespace-pre-wrap break-words text-sm font-mono text-base-content overflow-auto max-h-96">
                {result}
                </pre>
            </div>
            )}
        </div>
      </div>
    </>
  );
};

// Wrap the page in the existing Dashboard layout
DashboardPage.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default DashboardPage;