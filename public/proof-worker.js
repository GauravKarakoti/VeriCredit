// Web worker for off-main-thread proof generation
self.onmessage = async function(e) {
  const { program, functionName, inputs } = e.data;
  
  try {
    // Import SDK dynamically within worker
    const { ProgramManager, Account } = await import('@provablehq/sdk');
    
    // Create temporary account for execution
    const account = new Account();
    const programManager = new ProgramManager();
    programManager.setAccount(account);
    
    // Execute program locally with proof
    const result = await programManager.run(
      program,
      functionName,
      inputs,
      true // proveExecution
    );
    
    const outputs = result.getOutputs();
    const proof = result.getProof();
    
    self.postMessage({ 
      success: true, 
      outputs,
      proof: proof.toString()
    });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error.message 
    });
  }
};