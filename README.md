# VeriCredit – Private Credit Scoring & Lending on Aleo

**Prove your creditworthiness. Borrow without collateral. Keep your data private.**

VeriCredit is a decentralized lending protocol on Aleo that enables undercollateralized loans based on private credit scores. Borrowers generate zero-knowledge proofs of their creditworthiness without revealing any personal financial data. Lenders verify these proofs and provide capital, unlocking a new paradigm of private, inclusive DeFi lending.

![VeriCredit Demo](demo.gif)

## Table of Contents
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Undercollateralized loans**: Borrow based on reputation, not just collateral.
- **Private credit scoring**: Your credit history and score remain encrypted and are never exposed.
- **Selective disclosure**: Prove specific attributes (e.g., “score > 700”) without revealing the exact number.
- **Confidential loan terms**: Loan amounts, interest rates, and repayment schedules are private between borrower and lender.
- **Sybil resistance**: Unique identity anchors (e.g., ZK credentials from trusted issuers) prevent multiple identities.
- **Reputation portability**: Your credit score can be used across multiple dApps and chains via ZK proofs.

## How It Works
1. **Initial Credit Score Setup**: A user obtains a privacy-preserving identity anchor (e.g., from a KYC provider) and initializes their credit score record on Aleo. The record is encrypted and stored on-chain.
2. **Loan Request**: To borrow, the user’s frontend decrypts their credit score locally, generates a ZK proof that the score meets a lender’s threshold (e.g., >700), and submits a loan request with encrypted terms (amount, interest, duration).
3. **Lending Decision**: Lenders (or pools) see a list of loan requests with only high-level metadata (e.g., requested amount range, interest rate) and choose to fund. They can verify the borrower’s proof without seeing the actual score.
4. **Loan Active**: Upon funding, a loan record is created on-chain, encrypted to both parties. The borrower receives the funds; the lender’s capital is locked.
5. **Repayment & Score Update**: When the borrower repays, a transaction updates both parties’ balances and the borrower’s credit score (increased for on-time repayment, decreased for default). All updates happen privately.
6. **Default Handling**: If a loan defaults, the borrower’s credit score is penalized privately, affecting future borrowing ability. No public default event is recorded.

## Architecture
```text
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Leo Wallet │ │ VeriCredit │ │ Aleo Blockchain│
│ (User Auth) │─────▶│ Frontend │─────▶│ Smart Contracts│
└─────────────────┘ │ (React + SDK) │ │ - credit_score │
└─────────────────┘ │ - loan │
│ - verifier │
└─────────────────┘
```
- **Leo Wallet**: Manages user identity and transaction signing.
- **Frontend**: React app that handles proof generation, encryption/decryption, and interaction with contracts.
- **Smart Contracts**: Leo programs that manage private credit records, loan lifecycle, and proof verification.

## Getting Started

### Prerequisites
- [Leo](https://developer.aleo.org/leo/installation) (v1.9.0+)
- [Node.js](https://nodejs.org/) (v18+)
- [Leo Wallet](https://leo.app/) browser extension
- Aleo testnet account with credits (use [faucet](https://faucet.aleo.org/))

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/GauravKarakoti/vericredit.git
   cd vericredit
   ```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Build Leo smart contracts:
```bash
cd ../program
leo build
```

### Running Locally
1. Start the frontend development server:
```bash
cd frontend
npm start
```
2. Open http://localhost:3000 in your browser.
3. Ensure Leo Wallet is installed and connected to Aleo testnet.
4. Get testnet credits from the faucet.

## Smart Contracts
The contracts are in `/program`:
- `credit_score.leo`: Defines a private `CreditScore` record with fields `owner`, `score` (encrypted), and `nullifier`. Functions: `init_score`, `update_score` (called after loan events).
- `loan.leo`: Handles loan lifecycle. Records: `LoanRequest` (encrypted terms), `ActiveLoan` (encrypted to both parties). Functions: `request_loan`, `fund_loan`, `repay_loan`, `default_loan`.
- `verifier.leo`: Verifies ZK proofs for credit score thresholds and loan compliance.

## Frontend
The frontend (Next + TypeScript) includes:
- `src/wallet`: Leo Wallet integration.
- `src/credit`: Components for viewing/updating credit score.
- `src/loan`: Loan request creation, browsing, funding, and repayment.
- `src/proof`: Web worker for ZK proof generation.

## Testing
Run Leo contract tests:
```bash
cd contracts
leo test
```
Frontend tests:
```bash
cd frontend
npm test
```

## Deployment
1. Deploy contracts to Aleo testnet:
```bash
cd contracts
leo deploy --network testnet
```
2. Update frontend .env with contract addresses.
3. Build frontend:
```bash
cd frontend
npm run build
```
4. Deploy static files to Vercel.
