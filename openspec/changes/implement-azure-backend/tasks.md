# Implementation Tasks: Azure Backend

**Change ID:** `implement-azure-backend`  
**Version:** 1.0 (Azure Stack)  
**Last Updated:** December 24, 2025

---

## Prerequisites

- Azure subscription with owner/contributor role
- Node.js 20+ installed
- Visual Studio Code with Azure Functions extension
- Git for version control

---

## Week 1: Azure Setup & HTTP Triggers (18 hours)

### 1. Azure Environment Setup (2 hours)
- [ ] 1.1 Install tools:
  - `npm install -g azure-functions-core-tools@4`
  - `winget install Microsoft.AzureCLI`
- [ ] 1.2 Login: `az login`
- [ ] 1.3 Create resource group: `az group create --name rg-ai-roundtable --location eastus`
- [ ] 1.4 Install VS Code extensions: Azure Functions, Azure Account

---

### 2. CosmosDB Setup (3 hours)
- [ ] 2.1 Create CosmosDB account:
```bash
az cosmosdb create \
  --name cosmos-ai-roundtable \
  --resource-group rg-ai-roundtable \
  --default-consistency-level Session \
  --locations regionName=eastus
```
- [ ] 2.2 Create database and container:
```bash
az cosmosdb sql database create \
  --account-name cosmos-ai-roundtable \
  --name RoundTable \
  --resource-group rg-ai-roundtable

az cosmosdb sql container create \
  --account-name cosmos-ai-roundtable \
  --database-name RoundTable \
  --name runs \
  --partition-key-path "/id" \
  --throughput 400 \
  --resource-group rg-ai-roundtable
```
- [ ] 2.3 Configure indexing policy (status, createdAt)
- [ ] 2.4 Set TTL to 30 days (2592000 seconds)
- [ ] 2.5 Get connection string and save to Key Vault

**Test:** Query empty container in Data Explorer

---

### 3. Azure OpenAI Setup (2 hours)
- [ ] 3.1 Create Azure OpenAI resource:
```bash
az cognitiveservices account create \
  --name openai-roundtable \
  --resource-group rg-ai-roundtable \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```
- [ ] 3.2 Deploy GPT-4o model (deployment name: `gpt-4o`)
- [ ] 3.3 Get endpoint and key from Portal
- [ ] 3.4 Test with curl

---

### 4. Functions Project Init (2 hours)
- [ ] 4.1 Create project:
```bash
mkdir azure-backend
cd azure-backend
func init --typescript
npm install
```
- [ ] 4.2 Install dependencies:
```bash
npm install @azure/cosmos @azure/openai zod date-fns
npm install -D @types/node
```
- [ ] 4.3 Configure `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "...",
    "AZURE_OPENAI_ENDPOINT": "https://openai-roundtable.openai.azure.com/",
    "AZURE_OPENAI_KEY": "...",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o"
  }
}
```

---

### 5. HTTP Trigger: Preflight (3 hours)
- [ ] 5.1 Create function: `func new --name preflight --template "HTTP trigger"`
- [ ] 5.2 Implement validation logic (idea length, keywords)
- [ ] 5.3 Generate clarification questions (i18n keys)
- [ ] 5.4 Return `{ preflight_id, ready, questions }`
- [ ] 5.5 Test locally: `func start`

**Test:**
```bash
curl -X POST http://localhost:7071/api/preflight \
  -H "Content-Type: application/json" \
  -d '{"idea_text": "app"}'
```

---

### 6. HTTP Trigger: Create Run (3 hours)
- [ ] 6.1 Create function: `func new --name create-run --template "HTTP trigger"`
- [ ] 6.2 Generate run_id (format: `run_2025-12-24_0001`)
- [ ] 6.3 Create CosmosDB document with status=INIT
- [ ] 6.4 Start Durable Functions orchestrator (client binding)
- [ ] 6.5 Return `{ run_id, status: "INIT" }` immediately

---

### 7. HTTP Trigger: Get Run (3 hours)
- [ ] 7.1 Create function: `func new --name get-run --template "HTTP trigger"`
- [ ] 7.2 Query CosmosDB by run_id (partition key = id)
- [ ] 7.3 Return full document with conversation array
- [ ] 7.4 Handle 404 if run not found

---

## Week 2: Durable Functions Orchestration (20 hours)

### 8. Durable Functions Setup (2 hours)
- [ ] 8.1 Install: `npm install durable-functions`
- [ ] 8.2 Update `host.json` for Durable Functions
- [ ] 8.3 Create orchestrator: `func new --name RunAgentPipeline --template "Durable Functions orchestrator"`

---

### 9. Orchestrator Implementation (4 hours)
- [ ] 9.1 Define orchestrator function with 5 sequential activities
- [ ] 9.2 Call RefinerAgent activity
- [ ] 9.3 Call RealityCheckerAgent activity
- [ ] 9.4 Call AssassinAgent activity + veto check
- [ ] 9.5 If vetoed, update status and return early
- [ ] 9.6 Call CostAnalystAgent activity
- [ ] 9.7 Call SynthesizerAgent activity
- [ ] 9.8 Update final status to COMPLETED

```typescript
import * as df from "durable-functions";

const orchestrator = df.orchestrator(function* (context) {
  const { runId, ideaText } = context.df.getInput();
  const conversation = [];
  
  const refiner = yield context.df.callActivity("RefinerAgent", { ideaText, conversation });
  conversation.push(refiner);
  
  const reality = yield context.df.callActivity("RealityCheckerAgent", { ideaText, conversation });
  conversation.push(reality);
  
  const assassin = yield context.df.callActivity("AssassinAgent", { ideaText, conversation });
  conversation.push(assassin);
  
  if (assassin.structuredOutput.veto) {
    yield context.df.callActivity("UpdateRunDocument", { 
      runId, 
      status: "VETOED", 
      conversation 
    });
    return;
  }
  
  const cost = yield context.df.callActivity("CostAnalystAgent", { ideaText, conversation });
  conversation.push(cost);
  
  const synth = yield context.df.callActivity("SynthesizerAgent", { ideaText, conversation });
  conversation.push(synth);
  
  yield context.df.callActivity("UpdateRunDocument", { 
    runId, 
    status: "COMPLETED", 
    conversation,
    result: synth.structuredOutput
  });
});
```

---

### 10. Azure OpenAI Integration (3 hours)
- [ ] 10.1 Create `src/lib/openai-client.ts`
- [ ] 10.2 Initialize Azure OpenAI client with endpoint/key
- [ ] 10.3 Implement `callAgent(agentId, ideaText, conversation)` function
- [ ] 10.4 Use structured output mode with response_format
- [ ] 10.5 Add retry logic (3 attempts with exponential backoff)
- [ ] 10.6 Handle rate limits gracefully

---

### 11. Activity: RefinerAgent (2 hours)
- [ ] 11.1 Create activity function: `func new --name RefinerAgent --template "Durable Functions activity"`
- [ ] 11.2 Load prompt from AGENT_ORCHESTRATION.md
- [ ] 11.3 Call Azure OpenAI with idea_text (no conversation history)
- [ ] 11.4 Parse response (conversational_message + structured_output)
- [ ] 11.5 Return turn object

---

### 12. Activity: RealityCheckerAgent (2 hours)
- [ ] 12.1 Create activity function
- [ ] 12.2 Format conversation history from previous turn
- [ ] 12.3 Include "Reference the Refiner's analysis" in prompt
- [ ] 12.4 Call Azure OpenAI
- [ ] 12.5 Return turn object

---

### 13. Activity: AssassinAgent (2 hours)
- [ ] 13.1 Create activity function
- [ ] 13.2 Format full conversation (Refiner + Reality)
- [ ] 13.3 Include veto instructions in prompt
- [ ] 13.4 Parse veto boolean from structured output
- [ ] 13.5 Return turn object with veto flag

---

### 14. Activity: CostAnalystAgent (1 hour)
- [ ] 14.1 Create activity function
- [ ] 14.2 Format conversation (3 previous agents)
- [ ] 14.3 Call Azure OpenAI
- [ ] 14.4 Return turn object

---

### 15. Activity: SynthesizerAgent (1 hour)
- [ ] 15.1 Create activity function
- [ ] 15.2 Format full conversation (all 4 previous agents)
- [ ] 15.3 Call Azure OpenAI with synthesis prompt
- [ ] 15.4 Return turn object with final recommendation

---

### 16. Activity: UpdateRunDocument (2 hours)
- [ ] 16.1 Create activity function
- [ ] 16.2 Connect to CosmosDB
- [ ] 16.3 Patch document with new conversation turn
- [ ] 16.4 Update status field
- [ ] 16.5 Update completedAt timestamp if terminal state
- [ ] 16.6 Handle conflicts with etag

---

### 17. Testing Orchestration Locally (1 hour)
- [ ] 17.1 Start Functions: `func start`
- [ ] 17.2 Trigger orchestration via POST /create-run
- [ ] 17.3 Monitor orchestration logs
- [ ] 17.4 Verify CosmosDB document updates progressively
- [ ] 17.5 Test veto scenario (modify Assassin to always veto)
- [ ] 17.6 Test complete scenario (5 agents)

---

## Week 3: Frontend Integration (14 hours)

### 18. Real API Client (4 hours)
- [ ] 18.1 Create `ai-ideas-lab/src/lib/api.ts`
- [ ] 18.2 Replace imports from `mockApi.ts` to `api.ts`
- [ ] 18.3 Implement functions:
  - `preflightIdea(ideaText, presetId): Promise<PreflightResponse>`
  - `createRun(request): Promise<string>` (returns run_id)
  - `getRun(runId): Promise<GetRunResponse>`
- [ ] 18.4 Add environment variables:
```env
VITE_AZURE_FUNCTION_URL=http://localhost:7071
VITE_AZURE_FUNCTION_KEY=  # empty for local
```

---

### 19. Error Handling (3 hours)
- [ ] 19.1 Add retry logic with exponential backoff
- [ ] 19.2 Handle 404 (run not found)
- [ ] 19.3 Handle 500 (server errors)
- [ ] 19.4 Handle network timeouts
- [ ] 19.5 Show user-friendly error messages via toast

---

### 20. Testing with Real Latency (3 hours)
- [ ] 20.1 Test full flow: idea → preflight → create → poll → display
- [ ] 20.2 Verify typing indicators show correctly with real delays
- [ ] 20.3 Test polling interval (every 2 seconds)
- [ ] 20.4 Verify conversation updates progressively
- [ ] 20.5 Test veto scenario (stops at turn 3)

---

### 21. Environment Configuration (2 hours)
- [ ] 21.1 Create `.env.local` for development
- [ ] 21.2 Create `.env.production` template
- [ ] 21.3 Document setup in README
- [ ] 21.4 Add environment validation on startup

---

### 22. Production Build Test (2 hours)
- [ ] 22.1 Build frontend: `npm run build`
- [ ] 22.2 Preview: `npm run preview`
- [ ] 22.3 Test against local Azure Functions
- [ ] 22.4 Verify CORS configuration works

---

## Week 4: Deployment & Monitoring (14 hours)

### 23. Application Insights Setup (2 hours)
- [ ] 23.1 Create Application Insights resource:
```bash
az monitor app-insights component create \
  --app ai-roundtable-insights \
  --location eastus \
  --resource-group rg-ai-roundtable
```
- [ ] 23.2 Get instrumentation key
- [ ] 23.3 Add to Functions `local.settings.json`: `APPINSIGHTS_INSTRUMENTATIONKEY`
- [ ] 23.4 Verify telemetry in Portal

---

### 24. Deploy Azure Functions (3 hours)
- [ ] 24.1 Create Function App:
```bash
az functionapp create \
  --resource-group rg-ai-roundtable \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name func-ai-roundtable \
  --storage-account <storage-name>
```
- [ ] 24.2 Configure app settings (CosmosDB, OpenAI, App Insights)
- [ ] 24.3 Deploy: `func azure functionapp publish func-ai-roundtable`
- [ ] 24.4 Test deployed endpoints with curl

---

### 25. Deploy Frontend (2 hours)
- [ ] 25.1 Update `.env.production` with Azure Function URL
- [ ] 25.2 Deploy to Azure Static Web Apps or Vercel
- [ ] 25.3 Configure CORS on Azure Functions:
```bash
az functionapp cors add \
  --name func-ai-roundtable \
  --resource-group rg-ai-roundtable \
  --allowed-origins https://your-frontend.com
```

---

### 26. Integration Tests (3 hours)
- [ ] 26.1 Write test: Complete flow (5 agents)
- [ ] 26.2 Write test: Veto scenario (3 agents)
- [ ] 26.3 Write test: Preflight clarification
- [ ] 26.4 Write test: Error handling (timeout)
- [ ] 26.5 Run tests against deployed environment

---

### 27. Performance Testing (2 hours)
- [ ] 27.1 Measure p95 latency for complete run
- [ ] 27.2 Verify <60 seconds total time
- [ ] 27.3 Test concurrent runs (5 simultaneous)
- [ ] 27.4 Monitor CosmosDB RU consumption
- [ ] 27.5 Monitor Azure OpenAI token usage

---

### 28. Monitoring Dashboard (2 hours)
- [ ] 28.1 Create Application Insights dashboard
- [ ] 28.2 Add charts:
  - Run creation rate
  - Completion rate
  - Veto rate
  - Average latency per agent
  - Error rate
  - Token usage
- [ ] 28.3 Set up alerts for failures
- [ ] 28.4 Document monitoring URLs

---

## Validation Checklist

Before marking as complete:
- [ ] All 5 agents execute in correct order
- [ ] Conversation history passes correctly between agents
- [ ] Veto logic works (stops at Assassin, no Cost/Synthesizer)
- [ ] Frontend polls and displays conversation correctly
- [ ] CosmosDB document survives page refresh
- [ ] p95 latency <60 seconds
- [ ] Integration tests pass (100% success)
- [ ] Application Insights shows telemetry
- [ ] Production deployment successful
- [ ] No critical errors for 24 hours

---

## Cost Tracking

Monitor these metrics weekly:
- CosmosDB RU consumption (target: <400 RU/s avg)
- Azure OpenAI token usage (target: ~$0.80/run)
- Function execution count (free tier: 1M/month)
- Egress bandwidth (<5GB/month free)

**Expected monthly cost for 1000 runs:**
- CosmosDB: ~$50 (400 RU/s autoscale)
- Azure OpenAI: ~$400 (5 agents × $0.08/run × 1000)
- Azure Functions: ~$20 (consumption plan)
- Application Insights: ~$5 (basic telemetry)
- **Total: ~$475/month**

---

## Resources

- [proposal.md](./proposal.md) - Full design and architecture
- [Azure Functions TypeScript Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [Durable Functions Patterns](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview)
- [Azure OpenAI Quickstart](https://learn.microsoft.com/azure/ai-services/openai/quickstart)
- [CosmosDB Node.js SDK](https://learn.microsoft.com/azure/cosmos-db/nosql/sdk-nodejs)
