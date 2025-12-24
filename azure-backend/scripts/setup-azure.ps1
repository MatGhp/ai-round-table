# Azure Backend Infrastructure Setup Script (PowerShell)
# For AI Round Table MVP
# Created: December 24, 2025

$ErrorActionPreference = "Stop"

# Configuration
$RESOURCE_GROUP = "rg-ai-roundtable"
$LOCATION = "eastus"
$RANDOM_SUFFIX = Get-Random -Minimum 1000 -Maximum 9999
$COSMOS_ACCOUNT = "cosmos-ai-roundtable-$RANDOM_SUFFIX"
$COSMOS_DATABASE = "RoundTable"
$COSMOS_CONTAINER = "runs"
$OPENAI_ACCOUNT = "openai-roundtable-$RANDOM_SUFFIX"
$STORAGE_ACCOUNT = "stairt$RANDOM_SUFFIX"
$APP_INSIGHTS = "appi-ai-roundtable"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "AI Round Table - Azure Infrastructure Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login and verify subscription
Write-Host "Step 1: Azure Login" -ForegroundColor Yellow
az login
az account show

$confirmation = Read-Host "Is this the correct subscription? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Please select the correct subscription with: az account set --subscription <subscription-id>" -ForegroundColor Red
    exit 1
}

# Step 2: Create Resource Group
Write-Host ""
Write-Host "Step 2: Creating Resource Group" -ForegroundColor Yellow
az group create `
  --name $RESOURCE_GROUP `
  --location $LOCATION `
  --tags "project=ai-roundtable" "environment=dev"

Write-Host "✅ Resource Group created: $RESOURCE_GROUP" -ForegroundColor Green

# Step 3: Create CosmosDB Account
Write-Host ""
Write-Host "Step 3: Creating CosmosDB Account (this takes 3-5 minutes)" -ForegroundColor Yellow
az cosmosdb create `
  --name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --default-consistency-level Session `
  --locations regionName=$LOCATION `
  --capabilities EnableServerless `
  --tags "project=ai-roundtable"

Write-Host "✅ CosmosDB Account created: $COSMOS_ACCOUNT" -ForegroundColor Green

# Step 4: Create Database and Container
Write-Host ""
Write-Host "Step 4: Creating Database and Container" -ForegroundColor Yellow
az cosmosdb sql database create `
  --account-name $COSMOS_ACCOUNT `
  --name $COSMOS_DATABASE `
  --resource-group $RESOURCE_GROUP

az cosmosdb sql container create `
  --account-name $COSMOS_ACCOUNT `
  --database-name $COSMOS_DATABASE `
  --name $COSMOS_CONTAINER `
  --partition-key-path "/id" `
  --resource-group $RESOURCE_GROUP

Write-Host "✅ Container created: $COSMOS_CONTAINER" -ForegroundColor Green

# Step 5: Configure TTL
Write-Host ""
Write-Host "Step 5: Configuring TTL (30 days)" -ForegroundColor Yellow
az cosmosdb sql container update `
  --account-name $COSMOS_ACCOUNT `
  --database-name $COSMOS_DATABASE `
  --name $COSMOS_CONTAINER `
  --resource-group $RESOURCE_GROUP `
  --ttl 2592000

Write-Host "✅ TTL configured: 30 days" -ForegroundColor Green

# Step 6: Get CosmosDB Connection String
Write-Host ""
Write-Host "Step 6: Retrieving CosmosDB Connection String" -ForegroundColor Yellow
$COSMOS_CONNECTION_STRING = az cosmosdb keys list `
  --name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --type connection-strings `
  --query "connectionStrings[0].connectionString" `
  --output tsv

Write-Host "✅ Connection string retrieved" -ForegroundColor Green

# Step 7: Create Azure OpenAI Account
Write-Host ""
Write-Host "Step 7: Creating Azure OpenAI Account" -ForegroundColor Yellow
az cognitiveservices account create `
  --name $OPENAI_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --kind OpenAI `
  --sku S0 `
  --location $LOCATION `
  --yes

Write-Host "✅ Azure OpenAI Account created: $OPENAI_ACCOUNT" -ForegroundColor Green

# Step 8: Deploy GPT-4o Model
Write-Host ""
Write-Host "Step 8: Deploying GPT-4o Model" -ForegroundColor Yellow
az cognitiveservices account deployment create `
  --name $OPENAI_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --deployment-name gpt-4o `
  --model-name gpt-4o `
  --model-version "2024-08-06" `
  --model-format OpenAI `
  --sku-capacity 30 `
  --sku-name "Standard"

Write-Host "✅ GPT-4o model deployed" -ForegroundColor Green

# Step 9: Get OpenAI Keys
Write-Host ""
Write-Host "Step 9: Retrieving OpenAI Keys" -ForegroundColor Yellow
$OPENAI_KEY = az cognitiveservices account keys list `
  --name $OPENAI_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query "key1" `
  --output tsv

$OPENAI_ENDPOINT = az cognitiveservices account show `
  --name $OPENAI_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query "properties.endpoint" `
  --output tsv

Write-Host "✅ OpenAI credentials retrieved" -ForegroundColor Green

# Step 10: Create Storage Account
Write-Host ""
Write-Host "Step 10: Creating Storage Account" -ForegroundColor Yellow
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS

Write-Host "✅ Storage Account created: $STORAGE_ACCOUNT" -ForegroundColor Green

# Step 11: Create Application Insights
Write-Host ""
Write-Host "Step 11: Creating Application Insights" -ForegroundColor Yellow
az monitor app-insights component create `
  --app $APP_INSIGHTS `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --application-type web

$APPINSIGHTS_KEY = az monitor app-insights component show `
  --app $APP_INSIGHTS `
  --resource-group $RESOURCE_GROUP `
  --query "instrumentationKey" `
  --output tsv

Write-Host "✅ Application Insights created" -ForegroundColor Green

# Step 12: Output Configuration
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Save these values to your local.settings.json:" -ForegroundColor Yellow
Write-Host ""
Write-Host "COSMOS_CONNECTION_STRING=`"$COSMOS_CONNECTION_STRING`""
Write-Host "AZURE_OPENAI_ENDPOINT=`"$OPENAI_ENDPOINT`""
Write-Host "AZURE_OPENAI_KEY=`"$OPENAI_KEY`""
Write-Host "APPINSIGHTS_INSTRUMENTATIONKEY=`"$APPINSIGHTS_KEY`""
Write-Host ""
Write-Host "Resource Names:" -ForegroundColor Yellow
Write-Host "  Resource Group: $RESOURCE_GROUP"
Write-Host "  CosmosDB: $COSMOS_ACCOUNT"
Write-Host "  OpenAI: $OPENAI_ACCOUNT"
Write-Host "  Storage: $STORAGE_ACCOUNT"
Write-Host "  App Insights: $APP_INSIGHTS"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update ..\local.settings.json with the values above"
Write-Host "2. Run 'npm install' in azure-backend\"
Write-Host "3. Run 'func start' to start local development"
Write-Host ""
