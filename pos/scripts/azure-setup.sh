#!/bin/bash
# =============================================================================
# Azure Container Apps - Initial Setup Script
# Virtual Racing POS
# =============================================================================

set -e  # Exit on error

# -----------------------------------------------------------------------------
# Configuration - Adjust these values if needed
# -----------------------------------------------------------------------------
RESOURCE_GROUP="rg-virtual-racing"
LOCATION="eastus"
ACR_NAME="acrvirtualracing$(openssl rand -hex 4)"  # Unique name
ENVIRONMENT="cae-virtual-racing"
APP_NAME="pos"
IMAGE_NAME="virtual-racing-pos"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Azure Container Apps Setup${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Check Azure CLI login
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/7] Checking Azure CLI login...${NC}"
if ! az account show > /dev/null 2>&1; then
    echo -e "${RED}Not logged in. Running 'az login'...${NC}"
    az login
fi
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ACCOUNT_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Logged in to: $ACCOUNT_NAME${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Create Resource Group
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/7] Creating Resource Group: $RESOURCE_GROUP...${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none
echo -e "${GREEN}✓ Resource Group created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 3: Create Azure Container Registry
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/7] Creating Azure Container Registry: $ACR_NAME...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output none
ACR_SERVER="$ACR_NAME.azurecr.io"
echo -e "${GREEN}✓ ACR created: $ACR_SERVER${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 4: Create Container Apps Environment
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/7] Creating Container Apps Environment: $ENVIRONMENT...${NC}"
az containerapp env create \
    --name $ENVIRONMENT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none
echo -e "${GREEN}✓ Environment created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 5: Build and push Docker image
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/7] Building and pushing Docker image...${NC}"
az acr build \
    --registry $ACR_NAME \
    --image $IMAGE_NAME:latest \
    --target production \
    . \
    --output none
echo -e "${GREEN}✓ Image pushed to ACR${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 6: Create Container App
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/7] Creating Container App: $APP_NAME...${NC}"
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT \
    --image "$ACR_SERVER/$IMAGE_NAME:latest" \
    --target-port 4069 \
    --ingress external \
    --registry-server $ACR_SERVER \
    --registry-username $ACR_NAME \
    --registry-password "$ACR_PASSWORD" \
    --cpu 0.5 \
    --memory 1Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --env-vars \
        "VITE_API_URL=https://api.virtuales.bet" \
        "VITE_DEV_MODE=false" \
    --output none

APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
echo -e "${GREEN}✓ Container App created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 7: Create Service Principal for GitHub Actions
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[7/7] Creating Service Principal for GitHub Actions...${NC}"
SP_JSON=$(az ad sp create-for-rbac \
    --name "github-virtual-racing-pos" \
    --role contributor \
    --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
    --json-auth)
echo -e "${GREEN}✓ Service Principal created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "📦 ${YELLOW}Resources Created:${NC}"
echo "   Resource Group:  $RESOURCE_GROUP"
echo "   ACR Name:        $ACR_NAME"
echo "   ACR Server:      $ACR_SERVER"
echo "   Environment:     $ENVIRONMENT"
echo "   Container App:   $APP_NAME"
echo ""
echo -e "🌐 ${YELLOW}Application URL:${NC}"
echo -e "   ${GREEN}https://$APP_URL${NC}"
echo ""
echo -e "🔑 ${YELLOW}GitHub Secret (AZURE_CREDENTIALS):${NC}"
echo "   Copy this JSON and add it as a secret in GitHub:"
echo "   Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "$SP_JSON"
echo ""
echo -e "📝 ${YELLOW}Update workflow file with ACR name:${NC}"
echo "   Edit .github/workflows/deploy-azure.yml and set:"
echo "   AZURE_CONTAINER_REGISTRY: $ACR_NAME"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"
