#!/bin/bash

# Azure Backend Infrastructure Setup Script
# For AI Round Table MVP
# Created: December 24, 2025

set -e  # Exit on error

# Configuration
RESOURCE_GROUP="rg-ai-roundtable"
LOCATION="eastus"
COSMOS_ACCOUNT="cosmos-ai-roundtable-${RANDOM}"
COSMOS_DATABASE="RoundTable"
COSMOS_CONTAINER="runs"
OPENAI_ACCOUNT="openai-roundtable-${RANDOM}"
FUNCTION_APP="func-ai-roundtable-${RANDOM}"
STORAGE_ACCOUNT="stairt${RANDOM}"
APP_INSIGHTS="appi-ai-roundtable"

echo "========================================="
echo "AI Round Table - Azure Infrastructure Setup"
echo "========================================="
echo ""

# Step 1: Login and set subscription
echo "Step 1: Azure Login"
az login
az account show

read -p "Is this the correct subscription? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please select the correct subscription with: az account set --subscription <subscription-id>"
    exit 1
fi

# Step 2: Create Resource Group
echo ""
echo "Step 2: Creating Resource Group"
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags "project=ai-roundtable" "environment=dev"

echo "✅ Resource Group created: $RESOURCE_GROUP"

# Step 3: Create CosmosDB Account
echo ""
echo "Step 3: Creating CosmosDB Account (this takes 3-5 minutes)"
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --default-consistency-level Session \
  --locations regionName=$LOCATION \
  --capabilities EnableServerless \
  --tags "project=ai-roundtable"

echo "✅ CosmosDB Account created: $COSMOS_ACCOUNT"

# Step 4: Create Database and Container
echo ""
echo "Step 4: Creating Database and Container"
az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --name $COSMOS_DATABASE \
  --resource-group $RESOURCE_GROUP

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --database-name $COSMOS_DATABASE \
  --name $COSMOS_CONTAINER \
  --partition-key-path "/id" \
  --resource-group $RESOURCE_GROUP

echo "✅ Container created: $COSMOS_CONTAINER"

# Step 5: Configure TTL
echo ""
echo "Step 5: Configuring TTL (30 days)"
az cosmosdb sql container update \
  --account-name $COSMOS_ACCOUNT \
  --database-name $COSMOS_DATABASE \
  --name $COSMOS_CONTAINER \
  --resource-group $RESOURCE_GROUP \
  --ttl 2592000

echo "✅ TTL configured: 30 days"

# Step 6: Get CosmosDB Connection String
echo ""
echo "Step 6: Retrieving CosmosDB Connection String"
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

echo "✅ Connection string retrieved"

# Step 7: Create Azure OpenAI Account
echo ""
echo "Step 7: Creating Azure OpenAI Account"
az cognitiveservices account create \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind OpenAI \
  --sku S0 \
  --location $LOCATION \
  --yes

echo "✅ Azure OpenAI Account created: $OPENAI_ACCOUNT"

# Step 8: Deploy GPT-4o Model
echo ""
echo "Step 8: Deploying GPT-4o Model"
az cognitiveservices account deployment create \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 30 \
  --sku-name "Standard"

echo "✅ GPT-4o model deployed"

# Step 9: Get OpenAI Keys
echo ""
echo "Step 9: Retrieving OpenAI Keys"
OPENAI_KEY=$(az cognitiveservices account keys list \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "key1" \
  --output tsv)

OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "properties.endpoint" \
  --output tsv)

echo "✅ OpenAI credentials retrieved"

# Step 10: Create Storage Account (for Functions)
echo ""
echo "Step 10: Creating Storage Account"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

echo "✅ Storage Account created: $STORAGE_ACCOUNT"

# Step 11: Create Application Insights
echo ""
echo "Step 11: Creating Application Insights"
az monitor app-insights component create \
  --app $APP_INSIGHTS \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS \
  --resource-group $RESOURCE_GROUP \
  --query "instrumentationKey" \
  --output tsv)

echo "✅ Application Insights created"

# Step 12: Output Configuration
echo ""
echo "========================================="
echo "✅ Infrastructure Setup Complete!"
echo "========================================="
echo ""
echo "Save these values to your local.settings.json:"
echo ""
echo "COSMOS_CONNECTION_STRING=\"$COSMOS_CONNECTION_STRING\""
echo "AZURE_OPENAI_ENDPOINT=\"$OPENAI_ENDPOINT\""
echo "AZURE_OPENAI_KEY=\"$OPENAI_KEY\""
echo "APPINSIGHTS_INSTRUMENTATIONKEY=\"$APPINSIGHTS_KEY\""
echo ""
echo "Resource Names:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  CosmosDB: $COSMOS_ACCOUNT"
echo "  OpenAI: $OPENAI_ACCOUNT"
echo "  Storage: $STORAGE_ACCOUNT"
echo "  App Insights: $APP_INSIGHTS"
echo ""
echo "Next steps:"
echo "1. Update ../local.settings.json with the values above"
echo "2. Run 'npm install' in azure-backend/"
echo "3. Run 'func start' to start local development"
echo ""
