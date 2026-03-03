program vericredit.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}

    // Constants
    const MIN_CREDIT_SCORE: u32 = 300u32;
    const MAX_CREDIT_SCORE: u32 = 850u32;
    
    // Public state
    mapping loan_requests: address => field;  
    mapping active_loans: field => address;     
    mapping credit_scores: address => field;    
    
    // Records
    record CreditScore {
        owner: address,
        score_commitment: field, 
        history_root: field,      
        nullifier: field,         
    }
    
    record LoanRequest {
        owner: address,
        encrypted_terms: field,   
        score_proof: field,       
        nonce: field,             
    }
    
    record ActiveLoan {
        owner: address,           
        lender: address,          
        encrypted_details: field, 
        loan_id: field,           
    }

    // Structs for safe hashing of multiple values
    struct LoanTerms {
        min_amount: u64,
        max_amount: u64,
        min_interest: u8,
        max_interest: u8,
        duration_days: u16
    }

    struct LoanDetails {
        amount: u64,
        interest: u8,
        duration: u16
    }

    struct LoanIdInput {
        lender: address,
        borrower: address,
        amount: u64
    }
    
    async transition initialize_credit_score(
        public initial_score: u32,
    ) -> (CreditScore, Future) {
        // Validate score range
        assert(initial_score >= MIN_CREDIT_SCORE);
        assert(initial_score <= MAX_CREDIT_SCORE);
        
        let score_commitment: field = BHP256::hash_to_field(initial_score);
        let nullifier: field = BHP256::hash_to_field(self.caller);
        let history_root: field = 0field;
        
        let credit_record: CreditScore = CreditScore {
            owner: self.caller,
            score_commitment: score_commitment,
            history_root: history_root,
            nullifier: nullifier,
        };
        
        return (credit_record, finalize_initialize(self.caller, nullifier));
    }

    async function finalize_initialize(
        public caller: address,
        public nullifier: field,
    ) {
        let exists: bool = Mapping::contains(credit_scores, caller);
        assert(!exists);
        Mapping::set(credit_scores, caller, nullifier);
    }

    async transition create_loan_request(
        public min_amount: u64,
        public max_amount: u64,
        public min_interest: u8,
        public max_interest: u8,
        public duration_days: u16,
        credit_score_record: CreditScore,
        score_proof: field, 
        nonce: field, // User passes generated nonce as an argument
    ) -> (LoanRequest, Future) {
        
        assert(credit_score_record.owner == self.caller);
        assert(score_proof != 0field);
        
        // Group terms in a struct to safely hash them
        let terms: LoanTerms = LoanTerms {
            min_amount: min_amount,
            max_amount: max_amount,
            min_interest: min_interest,
            max_interest: max_interest,
            duration_days: duration_days
        };
        let terms_hash: field = BHP256::hash_to_field(terms);
        
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
        Mapping::set(loan_requests, borrower, terms_hash);
    }

    async transition fund_loan(
        borrower: address,
        request: LoanRequest,
        public funding_amount: u64,
        public interest_rate: u8,
        public duration_days: u16,
    ) -> (ActiveLoan, Future) { 
        assert(request.owner == borrower);
        
        // Use structs to generate hashes
        let id_input: LoanIdInput = LoanIdInput {
            lender: self.caller,
            borrower: borrower,
            amount: funding_amount
        };
        let loan_id: field = BHP256::hash_to_field(id_input);
        
        let details: LoanDetails = LoanDetails {
            amount: funding_amount,
            interest: interest_rate,
            duration: duration_days
        };
        let encrypted_details: field = BHP256::hash_to_field(details);
        
        let loan: ActiveLoan = ActiveLoan {
            owner: borrower,
            lender: self.caller,
            encrypted_details: encrypted_details,
            loan_id: loan_id,
        };
        
        return (loan, finalize_fund_loan(loan_id, borrower, self.caller));
    }

    async function finalize_fund_loan(
        public loan_id: field,
        public borrower: address,
        public lender: address,
    ) {
        Mapping::set(active_loans, loan_id, borrower);
        
        if Mapping::contains(loan_requests, borrower) {
            Mapping::remove(loan_requests, borrower);
        }
    }
}