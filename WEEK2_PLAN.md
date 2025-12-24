# Week 1 Complete ✅ - Next Steps for Week 2

**Last Updated:** December 24, 2025  
**Commit:** `0dcb886`  
**Status:** Week 1 Foundation Complete, Ready for Week 2

---

## ✅ Week 1 Achievements

### Infrastructure (100% Complete)
- ✅ Azure Resource Group: `rg-ai-roundtable`
- ✅ CosmosDB: `cosmos-ai-roundtable-5702` (serverless, 30-day TTL)
- ✅ Azure OpenAI: `openai-roundtable-5702` (GPT-4o deployed)
- ✅ Storage Account: `stairt5702`
- ✅ Application Insights: `appi-ai-roundtable`

### Code (100% Complete)
- ✅ PRD-001-azure-backend.md
- ✅ TypeScript project structure
- ✅ Zod schemas for all types
- ✅ CosmosDB client with CRUD operations
- ✅ 3 HTTP trigger endpoints:
  - `POST /api/preflight` - Validation & clarification questions
  - `POST /api/runs` - Create run (writes to CosmosDB)
  - `GET /api/runs/:id` - Retrieve run status
- ✅ Setup scripts (PowerShell + Bash)
- ✅ host.json configured for Durable Functions

### Documentation (100% Complete)
- ✅ README.md
- ✅ NEXT_STEPS.md
- ✅ INSTALL_NODE20.md
- ✅ PROGRESS.md
- ✅ OpenSpec tasks.md updated

---

## ⏸️ Pending Action (Manual)

**Install Node.js 20 LTS:**
1. Close current PowerShell terminal
2. Open new PowerShell terminal
3. Run:
   ```powershell
   nvm install 20
   nvm use 20
   node --version  # Verify v20.x.x
   ```
4. Test backend:
   ```powershell
   cd C:\me\git\ai-round-table\azure-backend
   npm install
   func start
   ```

See: [INSTALL_NODE20.md](../azure-backend/INSTALL_NODE20.md)

---

## 🎯 Week 2 Plan: Durable Functions + AI Agents

**Goal:** Complete sequential agent pipeline with Azure OpenAI integration

**Estimated Time:** 24 hours

---

### Task 1: Azure OpenAI Client (3 hours)

**File:** `src/lib/openai-client.ts`

**Implementation:**
```typescript
import { AzureOpenAI } from 'openai';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat';

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

export async function callAgent(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: any
): Promise<any> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: 'json_schema', json_schema: responseFormat },
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Test Criteria:**
- Successful call to Azure OpenAI
- Response parsed correctly
- Error handling for rate limits

---

### Task 2: Agent Prompts (2 hours)

**File:** `src/prompts/agents.ts`

**Implementation:**
```typescript
export const REFINER_PROMPT = `You are the Refiner agent...`;
export const REALITY_PROMPT = `You are the Reality Checker agent...`;
export const ASSASSIN_PROMPT = `You are the Assassin agent...`;
export const COST_PROMPT = `You are the Cost Analyst agent...`;
export const SYNTHESIZER_PROMPT = `You are the Synthesizer agent...`;

export function buildUserPrompt(
  ideaText: string,
  conversation: any[]
): string {
  return `
Idea: ${ideaText}

Previous Conversation:
${conversation.map(t => `${t.agent_name}: ${t.conversational_message}`).join('\n\n')}

Your task: ...
  `.trim();
}
```

**Test Criteria:**
- Prompts follow agent personas from docs
- Conversation history formatted correctly
- Max 700 char conversational messages

---

### Task 3: Activity Functions (8 hours)

**Files:**
- `src/activities/refiner-agent.ts`
- `src/activities/reality-agent.ts`
- `src/activities/assassin-agent.ts`
- `src/activities/cost-agent.ts`
- `src/activities/synthesizer-agent.ts`

**Template:**
```typescript
import { app, InvocationContext } from '@azure/functions';
import { callAgent } from '../lib/openai-client';
import { REFINER_PROMPT } from '../prompts/agents';
import { RefinerOutputSchema } from '../lib/schemas';

export async function refinerAgent(
  input: { ideaText: string; conversation: any[] },
  context: InvocationContext
): Promise<any> {
  const startTime = new Date();
  
  const systemPrompt = REFINER_PROMPT;
  const userPrompt = `Idea: ${input.ideaText}\n\nAnalyze this idea.`;
  
  const result = await callAgent(systemPrompt, userPrompt, RefinerOutputSchema);
  
  return {
    turn_number: 1,
    agent_id: 'refiner',
    agent_name: 'Refiner',
    conversational_message: result.conversational_message,
    structured_output: result.structured_output,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime.getTime(),
  };
}

app.activity('RefinerAgent', { handler: refinerAgent });
```

**Test Criteria:**
- Each agent returns valid turn object
- Conversational message ≤ 700 chars
- Structured output matches schema
- Timing recorded correctly

---

### Task 4: Durable Functions Orchestrator (4 hours)

**File:** `src/orchestrators/agent-pipeline.ts`

**Implementation:**
```typescript
import * as df from 'durable-functions';
import { updateRun, appendConversationTurn, updateRunStatus } from '../lib/cosmos-client';

const orchestrator = df.orchestrator(function* (context) {
  const { runId, ideaText } = context.df.getInput();
  const conversation = [];
  
  // Update status to IN_PROGRESS
  yield context.df.callActivity('UpdateRunStatus', { runId, status: 'IN_PROGRESS' });
  
  // Agent 1: Refiner
  const refiner = yield context.df.callActivity('RefinerAgent', { ideaText, conversation });
  conversation.push(refiner);
  yield context.df.callActivity('AppendTurn', { runId, turn: refiner });
  
  // Agent 2: Reality Checker
  const reality = yield context.df.callActivity('RealityCheckerAgent', { ideaText, conversation });
  conversation.push(reality);
  yield context.df.callActivity('AppendTurn', { runId, turn: reality });
  
  // Agent 3: Assassin (veto check)
  const assassin = yield context.df.callActivity('AssassinAgent', { ideaText, conversation });
  conversation.push(assassin);
  yield context.df.callActivity('AppendTurn', { runId, turn: assassin });
  
  if (assassin.structured_output.veto === true) {
    yield context.df.callActivity('FinalizeRun', { 
      runId, 
      status: 'VETOED',
      result: { veto_reason: assassin.structured_output.veto_reason }
    });
    return;
  }
  
  // Agent 4: Cost Analyst
  const cost = yield context.df.callActivity('CostAnalystAgent', { ideaText, conversation });
  conversation.push(cost);
  yield context.df.callActivity('AppendTurn', { runId, turn: cost });
  
  // Agent 5: Synthesizer
  const synth = yield context.df.callActivity('SynthesizerAgent', { ideaText, conversation });
  conversation.push(synth);
  yield context.df.callActivity('AppendTurn', { runId, turn: synth });
  
  yield context.df.callActivity('FinalizeRun', { 
    runId, 
    status: 'COMPLETED',
    result: synth.structured_output
  });
});

df.app.orchestration('AgentPipelineOrchestrator', orchestrator);
```

**Test Criteria:**
- Sequential execution (no parallel)
- Veto terminates pipeline
- All turns persisted to CosmosDB
- Final status correct

---

### Task 5: Helper Activities (2 hours)

**Files:**
- `src/activities/update-run-status.ts`
- `src/activities/append-turn.ts`
- `src/activities/finalize-run.ts`

**Purpose:** CosmosDB persistence helpers for orchestrator

---

### Task 6: Update create-run.ts (1 hour)

**Modification:**
```typescript
// Add after creating run document
const client = df.getClient(context);
const instanceId = await client.startNew(
  'AgentPipelineOrchestrator',
  { id: run_id },
  { runId: run_id, ideaText: idea_text }
);

context.log(`Orchestrator started: ${instanceId}`);
```

**Test Criteria:**
- Orchestrator starts automatically
- Run ID passed correctly

---

### Task 7: Integration Testing (4 hours)

**Tests:**
1. **Happy Path Test:**
   - Submit idea → 5 agents execute → status COMPLETED
   - All turns in conversation array
   - Result contains synthesizer output

2. **Veto Test:**
   - Submit problematic idea → stops at Assassin
   - Status VETOED
   - Only 3 turns in conversation

3. **Error Handling:**
   - Invalid API key → graceful failure
   - CosmosDB connection lost → retry logic
   - Rate limit → exponential backoff

**Tools:**
```powershell
# Create run
$run = Invoke-RestMethod -Method Post `
  -Uri http://localhost:7071/api/runs `
  -ContentType "application/json" `
  -Body '{"idea_text":"Build a mobile app"}'

# Poll for completion
do {
  Start-Sleep -Seconds 2
  $status = Invoke-RestMethod -Uri "http://localhost:7071/api/runs/$($run.run_id)"
  Write-Host "Status: $($status.status)"
} while ($status.status -in @('INIT', 'IN_PROGRESS'))

# Check result
$status | ConvertTo-Json -Depth 10
```

---

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Pipeline Latency** | <60s | Orchestrator total duration |
| **Veto Rate** | 20-40% | Successful veto terminations |
| **Error Rate** | <5% | Failed runs / total runs |
| **Cost per Run** | <$0.50 | Azure OpenAI tokens × rate |
| **Conversation Quality** | 100% | No truncated messages |

---

## 🚀 Development Workflow

### Daily Cycle
1. **Morning:** Pick 1-2 tasks from Week 2 plan
2. **Implement:** Write code + unit tests
3. **Test:** Run locally with `func start`
4. **Document:** Update PROGRESS.md with decisions
5. **Commit:** Atomic commits per task

### Testing Pattern
```powershell
# Terminal 1: Run Functions
cd C:\me\git\ai-round-table\azure-backend
func start

# Terminal 2: Test endpoints
cd C:\me\git\ai-round-table\azure-backend
.\test-endpoints.ps1  # Create this script
```

---

## 📝 Open Questions for Week 2

1. **Prompt Engineering:**
   - Should agents see full conversation or just summaries?
   - How to enforce 700 char limit on conversational messages?

2. **Error Handling:**
   - Retry count for Azure OpenAI failures?
   - Should orchestrator continue if one agent fails?

3. **Performance:**
   - Can we cache prompts to reduce tokens?
   - Should we use batch APIs for cost savings?

---

## 🎯 Definition of Done (Week 2)

- [ ] All 5 agent activities implemented
- [ ] Orchestrator completes full pipeline locally
- [ ] Veto logic tested and working
- [ ] All conversation turns persist to CosmosDB
- [ ] Integration tests pass (happy path + veto)
- [ ] P95 latency < 60 seconds
- [ ] No conversational messages >700 chars
- [ ] Code committed with descriptive messages

---

## 📚 References

- [Durable Functions Docs](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview)
- [Azure OpenAI Structured Outputs](https://learn.microsoft.com/azure/ai-services/openai/how-to/structured-outputs)
- [Agent Orchestration Spec](../ai-ideas-lab/docs/AGENT_ORCHESTRATION.md)

---

**Current Status:** Week 1 complete, ready to start Week 2 after Node.js 20 installation.

**Next Command:** Follow [INSTALL_NODE20.md](../azure-backend/INSTALL_NODE20.md) → Test HTTP endpoints → Start Task 1 (OpenAI Client)
