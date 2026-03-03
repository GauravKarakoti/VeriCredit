import { Account, ProgramManager, AleoNetworkClient, NetworkRecordProvider, AleoKeyProvider } from '@provablehq/sdk';

export class AleoProvider {
  private account: Account;
  private programManager: ProgramManager;
  private networkClient: AleoNetworkClient;
  
  constructor(privateKey: string) {
    // Initialize account
    this.account = new Account({ privateKey });
    
    // Connect to network (using Aleo testnet by default)
    this.networkClient = new AleoNetworkClient('https://api.explorer.provable.com/v1');
    
    // Set up record provider
    const recordProvider = new NetworkRecordProvider(this.account, this.networkClient);
    
    // Set up key provider
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    
    // Initialize program manager
    this.programManager = new ProgramManager(
      'https://api.explorer.provable.com/v1',
      keyProvider,
      recordProvider
    );
    
    this.programManager.setAccount(this.account);
  }
  
  async executeProgram(
    programId: string,
    functionName: string,
    inputs: string[],
    fee: number = 0.01
  ) {
    try {
      const transactionId = await this.programManager.execute({
        programId,
        functionName,
        inputs,
        priorityFee: fee,
        privateFee: false,
        keySearchParams: { cacheKey: `${programId}:${functionName}` }
      });
      
      return transactionId;
    } catch (error) {
      console.error('Execution failed:', error);
      throw error;
    }
  }
  
  async getTransaction(transactionId: string) {
    return await this.networkClient.getTransaction(transactionId);
  }
}