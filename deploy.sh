#!/bin/bash

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

NETWORK="testnet"
PROGRAM_DIR="program"

if [ -f .env ]; then
    echo -e "📄 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "⚠️  Warning: .env file not found. Ensure PRIVATE_KEY is set in your shell."
fi

echo -e "🚀 Starting deployment of VeriCredit..."

if [ -d "$PROGRAM_DIR" ]; then
    cd "$PROGRAM_DIR"
else
    echo -e "${RED}❌ Error: Directory '$PROGRAM_DIR' not found.${NC}"
    exit 1
fi

echo -e "🛠  Building the contract..."
leo build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "🌐 Deploying to $NETWORK network..."
leo deploy --network testnet --endpoint https://api.explorer.provable.com/v2 --broadcast --save "./deploy_tx" --print || {
    echo -e "${RED}❌ Failed to deploy${NC}"
    exit 1
}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
else
    echo -e "${RED}❌ Deployment failed. Please check your private key, network connection, and credit balance.${NC}"
    exit 1
fi

# Note: Update 'initialize_credit_score' and '"700u32"' to match your exact Leo function and inputs
echo -e "🎬 Initializing the contract..."
leo execute initialize_credit_score "700u32" \
    --network testnet \
    --endpoint https://api.explorer.provable.com/v2 \
    --broadcast || {
    echo -e "${RED}❌ Failed to initialize contract${NC}"
    exit 1
}

echo -e "${GREEN}✅ Initialization successful!${NC}"