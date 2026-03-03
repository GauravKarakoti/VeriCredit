program vericredit.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}
    // Constants
    const MERKLE_DEPTH: u8 = 16u8;  // Supports up to 65,536 historical events
    const MIN_CREDIT_SCORE: u32 = 300u32;
    const MAX_CREDIT_SCORE: u32 = 850u32;
    
    // Public state - mappings are visible on-chain but contain commitments
    mapping loan_requests: address => field;  // Address -> commitment to request
    mapping active_loans: field => field;     // Loan ID -> encrypted loan data
    
    // Records - private state owned by users
    record CreditScore {
        owner: address,
        score_commitment: field,  // Commitment to actual score
        history_root: field,      // Merkle root of repayment history
        nullifier: field,         // Unique identifier to prevent double-spending
    }
    
    record LoanRequest {
        owner: address,
        encrypted_terms: field,   // Encrypted loan terms
        score_proof: field,       // ZK proof of creditworthiness
        nonce: field,             // Random nonce for unlinkability
    }
    
    record ActiveLoan {
        owner: address,           // Borrower
        lender: address,          // Lender
        encrypted_details: field, // Encrypted loan details (amount, rate, duration)
        loan_id: field,           // Unique loan identifier
    }
    
    async transition initialize_credit_score(
        public initial_score: u32,
    ) -> (CreditScore, Future) {
        // Validate score range
        assert(initial_score >= MIN_CREDIT_SCORE);
        assert(initial_score <= MAX_CREDIT_SCORE);
        
        // Create a commitment to the score (hides actual value)
        let score_commitment: field = BHP256::hash_to_field(initial_score);
        
        // Generate nullifier (prevents duplicate credit scores)
        let nullifier: field = BHP256::hash_to_field(self.caller);
        
        // Create initial Merkle root (empty tree)
        let history_root: field = 0field;
        
        // Create the credit score record
        let credit_record: CreditScore = CreditScore {
            owner: self.caller,
            score_commitment: score_commitment,
            history_root: history_root,
            nullifier: nullifier,
        };
        
        // Return record and finalize to update public state
        return (credit_record, finalize_initialize(self.caller, nullifier));
    }

    async function finalize_initialize(
        public caller: address,
        public nullifier: field,
    ) {
        // Store nullifier in a public mapping to prevent re-initialization
        let exists: bool = Mapping::contains(credit_scores, caller);
        assert(!exists);
        Mapping::set(credit_scores, caller, nullifier);
    }

    inline fn poseidon2(left: field, right: field) -> field {
        return Poseidon2::hash_to_field(left, right);
    }

    // Helper: Verify a Merkle proof
    inline fn verify_merkle_proof(
        leaf: field,
        path: [field; MERKLE_DEPTH],
        root: field,
        leaf_index: u32,
    ) -> bool {
        let mut computed_hash: field = leaf;
        let mut index: u32 = leaf_index;
        
        for i in 0..MERKLE_DEPTH {
            // Determine if we're on left or right based on index bit
            let is_right: bool = (index & 1u32) == 1u32;
            
            if is_right {
                computed_hash = poseidon2(path[i], computed_hash);
            } else {
                computed_hash = poseidon2(computed_hash, path[i]);
            }
            
            // Shift index for next level
            index = index / 2u32;
        }
        
        return computed_hash == root;
    }

    async transition create_loan_request(
        public min_amount: u64,
        public max_amount: u64,
        public min_interest: u8,
        public max_interest: u8,
        public duration_days: u16,
        credit_score_record: CreditScore,
        score_proof: field,  // ZK proof that score meets threshold
    ) -> (LoanRequest, Future) {
        // Verify the credit score record belongs to caller
        assert(credit_score_record.owner == self.caller);
        
        // Verify the score proof (simplified - in production would verify actual proof)
        // This is where you'd call a verifier circuit
        assert(score_proof != 0field);
        
        // Create loan terms object (would be encrypted in production)
        let terms_hash: field = BHP256::hash_to_field(
            min_amount + max_amount + (min_interest as u64) + (max_interest as u64) + (duration_days as u64)
        );
        
        // Generate random nonce for unlinkability
        let nonce: field = ChaCha::rand_field();
        
        // Create loan request record
        let request: LoanRequest = LoanRequest {
            owner: self.caller,
            encrypted_terms: terms_hash,
            score_proof: score_proof,
            nonce: nonce,
        };
        
        return (request, finalize_create_request(self.caller, terms_hash));
    }

    async function finalize_create_request(
        public borrower: address,
        public terms_hash: field,
    ) {
        // Store commitment to loan request publicly
        Mapping::set(loan_requests, borrower, terms_hash);
    }

    async transition fund_loan(
        borrower: address,
        request: LoanRequest,
        public funding_amount: u64,
        public interest_rate: u8,
        public duration_days: u16,
        fee_record: credits.aleo/credits.aleo/Credits,  // For paying fees
    ) -> (ActiveLoan, credits.aleo/credits.aleo/Credits, Future) {
        // Verify the request belongs to the borrower
        assert(request.owner == borrower);
        
        // Generate unique loan ID
        let loan_id: field = BHP256::hash_to_field(self.caller + borrower + funding_amount);
        
        // Encrypt loan details (simplified - would use proper encryption)
        let encrypted_details: field = BHP256::hash_to_field(
            funding_amount + (interest_rate as u64) + (duration_days as u64)
        );
        
        // Create active loan record
        let loan: ActiveLoan = ActiveLoan {
            owner: borrower,
            lender: self.caller,
            encrypted_details: encrypted_details,
            loan_id: loan_id,
        };
        
        // Split fee record (simplified - actual fee handling is more complex)
        let updated_fee: credits.aleo/credits.aleo/Credits = fee_record;
        
        return (loan, updated_fee, finalize_fund_loan(loan_id, borrower, self.caller));
    }

    async function finalize_fund_loan(
        public loan_id: field,
        public borrower: address,
        public lender: address,
    ) {
        // Store active loan in public mapping
        Mapping::set(active_loans, loan_id, borrower);
        
        // Remove loan request from public mapping
        if Mapping::contains(loan_requests, borrower) {
            Mapping::remove(loan_requests, borrower);
        }
    }
}