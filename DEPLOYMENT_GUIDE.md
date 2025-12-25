# Azure Deployment Guide

**Status**: Ready to deploy  
**Date**: December 25, 2025

## Prerequisites Completed ✅

- ✅ Backend fully functional (5 agents working)
- ✅ Frontend fully functional (landing + results pages)
- ✅ Assassin prompt refined and tested
- ✅ Result object bug fixed
- ✅ End-to-end testing successful
- ✅ GitHub Actions workflow created

## Azure Resources Needed

### 1. Azure Function App
- **Name**: `func-ai-roundtable` (or your choice)
- **Runtime**: Node.js 20
- **Plan**: Consumption (pay-per-execution)
- **Region**: Choose closest to users

### 2. Azure Static Web App
- **Name**: `ai-ideas-lab` (or your choice)
- **Region**: Automatic (global CDN)
- **Build preset**: React

### 3. Existing Resources (Already Have)
- ✅ Azure CosmosDB account
- ✅ Azure OpenAI service

## Deployment Steps

### Step 1: Create Azure Function App

```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_NAME"

# Create resource group (if needed)
az group create --name rg-ai-roundtable --location eastus

# Create Azure Function App
az functionapp create \
  --resource-group rg-ai-roundtable \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name func-ai-roundtable \
  --storage-account YOUR_STORAGE_ACCOUNT
```

### Step 2: Configure Function App Settings

```bash
# Add application settings
az functionapp config appsettings set \
  --name func-ai-roundtable \
  --resource-group rg-ai-roundtable \
  --settings \
    "COSMOS_CONNECTION_STRING=YOUR_COSMOS_CONNECTION_STRING" \
    "AZURE_OPENAI_ENDPOINT=YOUR_OPENAI_ENDPOINT" \
    "AZURE_OPENAI_KEY=YOUR_OPENAI_KEY" \
    "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4" \
    "AzureWebJobsFeatureFlags=EnableWorkerIndexing"
```

### Step 3: Get Publish Profile

```bash
# Download publish profile
az functionapp deployment list-publishing-profiles \
  --name func-ai-roundtable \
  --resource-group rg-ai-roundtable \
  --xml > publish-profile.xml

# Copy the XML content to add as GitHub secret
cat publish-profile.xml
```

### Step 4: Create Azure Static Web App

```bash
# Create Static Web App
az staticwebapp create \
  --name ai-ideas-lab \
  --resource-group rg-ai-roundtable \
  --location eastus2 \
  --source https://github.com/MatGhp/ai-round-table \
  --branch main \
  --app-location "/ai-ideas-lab" \
  --output-location "dist" \
  --login-with-github

# Get deployment token
az staticwebapp secrets list \
  --name ai-ideas-lab \
  --resource-group rg-ai-roundtable \
  --query "properties.apiKey" -o tsv
```

### Step 5: Configure GitHub Secrets

Go to: https://github.com/MatGhp/ai-round-table/settings/secrets/actions

Add these secrets:

1. **AZURE_FUNCTIONAPP_PUBLISH_PROFILE**
   - Value: Content from `publish-profile.xml`

2. **AZURE_STATICWEBAPP_TOKEN**
   - Value: API key from Static Web App

3. **AZURE_STATICWEBAPP_URL** (optional, for smoke tests)
   - Value: Your Static Web App URL (e.g., `https://ai-ideas-lab.azurestaticapps.net`)

### Step 6: Update Frontend Environment

Create `ai-ideas-lab/.env.production`:

```bash
VITE_API_BASE_URL=https://func-ai-roundtable.azurewebsites.net
```

### Step 7: Deploy

```bash
# Commit the workflow and env file
git add .github/workflows/deploy.yml ai-ideas-lab/.env.production
git commit -m "Add Azure deployment workflow"
git push origin main
```

The GitHub Action will automatically:
1. Build and deploy backend to Azure Functions
2. Build and deploy frontend to Azure Static Web Apps
3. Run smoke tests to verify deployment

## Verification Steps

### 1. Check Backend

```bash
# Test preflight endpoint
curl https://func-ai-roundtable.azurewebsites.net/api/preflight

# Create a test run
curl -X POST https://func-ai-roundtable.azurewebsites.net/api/runs \
  -H "Content-Type: application/json" \
  -d '{"idea_text": "Test deployment idea"}'
```

### 2. Check Frontend

Visit: https://YOUR-STATIC-WEB-APP.azurestaticapps.net

- Submit an idea
- Verify results page displays
- Check all 5 agents appear

### 3. Check Logs

```bash
# Function App logs
az functionapp log tail \
  --name func-ai-roundtable \
  --resource-group rg-ai-roundtable

# Static Web App logs (in Azure Portal)
```

## Monitoring Setup

### Application Insights Queries

```kusto
// Error rate
requests
| where timestamp > ago(1h)
| summarize 
    TotalRequests = count(),
    FailedRequests = countif(success == false),
    ErrorRate = 100.0 * countif(success == false) / count()
| project ErrorRate, TotalRequests, FailedRequests

// Response time
requests
| where timestamp > ago(1h)
| summarize 
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
| project p50, p95, p99

// Veto rate
customEvents
| where name == "AgentOutput" and customDimensions.agent_id == "assassin"
| extend veto = tobool(customDimensions.veto)
| summarize VetoRate = 100.0 * countif(veto) / count()
```

### Alerts to Configure

1. **Error Rate > 5%** (last 15 min)
2. **Response Time > 30s** (p95)
3. **Veto Rate > 50%** (indicates Assassin regression)

## Rollback Procedure

If deployment fails:

```bash
# Rollback Function App
az functionapp deployment source sync \
  --name func-ai-roundtable \
  --resource-group rg-ai-roundtable

# Or redeploy previous commit
git revert HEAD
git push origin main
```

## Cost Estimate

- **Azure Functions** (Consumption): ~$5-20/month (depends on usage)
- **CosmosDB** (Serverless): ~$1-10/month (depends on reads/writes)
- **Static Web App** (Free tier): $0
- **Azure OpenAI**: Pay-per-token (GPT-4o pricing)

**Total estimated**: $10-50/month for MVP usage

## Security Checklist

- ✅ Secrets in GitHub Secrets (not in code)
- ✅ Connection strings use Managed Identity where possible
- ✅ CORS configured for Static Web App domain only
- ✅ HTTPS enforced for all endpoints
- ⏳ Application Insights enabled (configure after deployment)
- ⏳ Rate limiting (add if needed based on usage)

## Next Steps After Deployment

1. ✅ Verify smoke tests pass
2. ✅ Test end-to-end flow with real idea
3. ✅ Check Application Insights dashboard
4. ⏳ Configure alerts
5. ⏳ Set up budget alerts in Azure
6. ⏳ Document production URL for users
7. ⏳ Monitor Assassin veto rate (should be 5-15%)

## Troubleshooting

### Backend Issues

**Problem**: Function App not responding  
**Solution**: Check Application Settings have all required connection strings

**Problem**: Durable Functions orchestration fails  
**Solution**: Verify storage account connection and AzureWebJobsFeatureFlags setting

### Frontend Issues

**Problem**: API calls fail (CORS)  
**Solution**: Configure CORS in Function App to allow Static Web App domain

**Problem**: Environment variables not loaded  
**Solution**: Ensure `VITE_API_BASE_URL` is set at build time, not runtime

## Support Resources

- Azure Functions: https://docs.microsoft.com/azure/azure-functions/
- Static Web Apps: https://docs.microsoft.com/azure/static-web-apps/
- Durable Functions: https://docs.microsoft.com/azure/azure-functions/durable/
