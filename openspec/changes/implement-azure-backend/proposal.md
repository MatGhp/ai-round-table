# Change Proposal: Implement Azure Backend

**Change ID:** `implement-azure-backend`  
**Created:** December 24, 2025  
**Status:** Proposed  
**Priority:** P0 (Critical)

---

## Summary

Implement the complete backend infrastructure for AI Round Table using Azure Functions, Durable Functions, CosmosDB, and Azure OpenAI Service to replace the current mock API implementation.

---

## Motivation

### Current State
- Frontend MVP is complete with conversational UI
- All user interactions use `mockApi.ts` with simulated responses
- No persistence, no real AI agents, no production capability

### Problems with Current State
1. **No Real AI Processing:** Mock data doesn't validate if agent prompts work
2. **No Persistence:** Runs disappear on page refresh
3. **No Production Path:** Cannot deploy for real users
4. **Testing Limited:** Cannot validate latency, error handling, rate limits

### Desired State
- Production-ready backend with CosmosDB persistence
- Sequential AI agent pipeline (5 agents) via Durable Functions orchestrator
- Real conversation history between agents
- Sub-60-second total execution time
- Application Insights monitoring and error tracking

---

## Scope

### In Scope

#### Database Layer (CosmosDB)
- Design conversation-first document schema
- Create container with partition key strategy
- Configure indexing policies for performance
- Set up TTL policies for run cleanup

#### API Layer (Azure Functions - HTTP Triggers)
- **POST /preflight** - Rule-based validation and clarification questions
- **POST /runs** - Create run, start Durable Functions orchestrator
- **GET /runs/:id** - Polling endpoint with conversation history

#### Agent Orchestration (Durable Functions)
- Orchestrator function with sequential agent execution
- Activity functions for each agent (5 activities)
- Azure OpenAI Service integration (GPT-4o, structured outputs mode)
- Conversation history builder (each agent sees previous messages)
- Veto logic (terminate orchestration if Assassin vetoes)
- CosmosDB persistence after each agent turn

#### Frontend Integration
- Replace `mockApi.ts` with real API client (`api.ts`)
- Environment variables (VITE_AZURE_FUNCTION_URL, VITE_AZURE_FUNCTION_KEY)
- Error handling for real failure modes
- Retry logic with exponential backoff

### Out of Scope (Future Work)
- User authentication (Azure AD B2C)
- Run history page
- Custom agent presets
- Streaming responses
- Agent enable/disable functionality
- Multi-language support (i18n prepared but English-only for MVP)

---

## Design

### Architecture Diagram

```
Client (React Frontend)
       ↓
Azure Functions (HTTP Triggers)
       ↓
   POST /runs
       ↓
Durable Functions Orchestrator
       ↓
┌──────────────────────────────────────────┐
│  Sequential Activity Execution           │
│  ┌────────────────────────────────────┐  │
│  │ Activity: RefinerAgent             │  │
│  │    ↓ persist turn to CosmosDB      │  │
│  │ Activity: RealityCheckerAgent      │  │
│  │    ↓ persist turn to CosmosDB      │  │
│  │ Activity: AssassinAgent            │  │
│  │    ↓ check veto → terminate if true│  │
│  │    ↓ persist turn to CosmosDB      │  │
│  │ Activity: CostAnalystAgent         │  │
│  │    ↓ persist turn to CosmosDB      │  │
│  │ Activity: SynthesizerAgent         │  │
│  │    ↓ persist turn to CosmosDB      │  │
│  └────────────────────────────────────┘  │
│         ↓                                 │
│  Update run document status=COMPLETED    │
└──────────────────────────────────────────┘
         ↑
         │ (polls every 1-2 seconds)
         │
    GET /runs/:id ──> Query CosmosDB
                      (single document read)
                      
Azure OpenAI Service
  ↑ (called from each activity)
  │
  └─ GPT-4o structured outputs
```

### Database Design (CosmosDB)

**Single Document Per Run:**
```json
{
  "id": "run_2025-12-24_0001",
  "partitionKey": "run_2025-12-24_0001",
  "status": "COMPLETED",
  "ideaText": "Build a mobile app for water tracking",
  "presetId": "default",
  "conversation": [
    {
      "turnNumber": 1,
      "agentId": "refiner",
      "agentName": "Refiner",
      "conversationalMessage": "I've structured your idea...",
      "structuredOutput": { "core_problem": "...", "target_user": "..." },
      "timestamp": "2025-12-24T10:00:01Z",
      "durationMs": 1200
    },
    {
      "turnNumber": 2,
      "agentId": "reality",
      "agentName": "Reality Checker",
      "conversationalMessage": "The Refiner laid out a solid structure...",
      "structuredOutput": { "concerns": [...], "viability_score": 7.5 },
      "timestamp": "2025-12-24T10:00:03Z",
      "durationMs": 1500
    }
  ],
  "result": {
    "recommendation": "PROCEED",
    "confidence": 8.2,
    "summary": "..."
  },
  "metadata": {
    "configVersion": "mvp-1.0",
    "temperature": 0.2,
    "totalAgents": 5
  },
  "createdAt": "2025-12-24T10:00:00Z",
  "completedAt": "2025-12-24T10:00:15Z",
  "ttl": 2592000
}
```

**Benefits:**
- Single query retrieves complete run + conversation
- Atomic updates via CosmosDB transactions
- Natural JSON structure matches TypeScript types
- TTL for automatic cleanup after 30 days

**Status Flow:**
```
INIT → AGENTS_RUNNING → [VETOED | COMPLETED | FAILED]
```

### API Contracts

#### POST /preflight
```typescript
Request:  { idea_text: string, preset_id?: string }
Response: { 
  preflight_id: string,
  ready: boolean,
  questions?: Question[],
  notes?: string 
}
```

#### POST /runs
```typescript
Request:  { 
  idea_text: string,
  preset_id?: string,
  preflight_id?: string,
  clarifications?: Clarification[]
}
Response: { run_id: string, status: "INIT" }
```

#### GET /runs/:id
```typescript
Response: {
  run_id: string,
  status: "INIT" | "AGENTS_RUNNING" | "VETOED" | "COMPLETED" | "FAILED",
  conversation: {
    turns: ConversationTurn[],
    current_agent_index: number,
    total_agents: number
  },
  result?: SynthesizedResult,
  metadata: RunMetadata,
  error?: ErrorDetails
}
```

### Agent Pipeline Logic (Durable Functions)

```typescript
import * as df from "durable-functions";

// Orchestrator function
const orchestrator = df.orchestrator(function* (context) {
  const input = context.df.getInput();
  const { runId, ideaText } = input;
  
  const conversation = [];
  
  // 1. Refiner Agent
  const refiner = yield context.df.callActivity("RefinerAgent", { ideaText, conversation });
  conversation.push(refiner);
  yield context.df.callActivity("PersistTurn", { runId, turn: refiner });
  
  // 2. Reality Checker Agent
  const reality = yield context.df.callActivity("RealityCheckerAgent", { ideaText, conversation });
  conversation.push(reality);
  yield context.df.callActivity("PersistTurn", { runId, turn: reality });
  
  // 3. Assassin Agent
  const assassin = yield context.df.callActivity("AssassinAgent", { ideaText, conversation });
  conversation.push(assassin);
  yield context.df.callActivity("PersistTurn", { runId, turn: assassin });
  
  // Check for veto
  if (assassin.structuredOutput.veto) {
    yield context.df.callActivity("UpdateRunStatus", { runId, status: "VETOED" });
    return { status: "VETOED", conversation };
  }
  
  // 4. Cost Analyst Agent
  const cost = yield context.df.callActivity("CostAnalystAgent", { ideaText, conversation });
  conversation.push(cost);
  yield context.df.callActivity("PersistTurn", { runId, turn: cost });
  
  // 5. Synthesizer Agent
  const synthesizer = yield context.df.callActivity("SynthesizerAgent", { ideaText, conversation });
  conversation.push(synthesizer);
  yield context.df.callActivity("PersistTurn", { runId, turn: synthesizer });
  
  // Complete
  yield context.df.callActivity("UpdateRunStatus", { 
    runId, 
    status: "COMPLETED",
    result: synthesizer.structuredOutput 
  });
  
  return { status: "COMPLETED", conversation };
});

df.app.orchestration("RunAgentPipeline", orchestrator);
```

**Key Benefits:**
- Automatic retries on failure (configurable)
- Built-in state persistence
- Checkpointing between activities
- Replay-safe (deterministic execution)
- Can scale activities independently

---

## Benefits

### User Benefits
- **Real AI Analysis:** Actual LLM reasoning, not mock data
- **Persistence:** Can refresh page, return to runs later
- **Reliable Results:** Database-backed, no lost data
- **Fast Experience:** <60s total time, progressive updates via polling

### Development Benefits
- **Testing Real Scenarios:** Validate prompts, latency, error handling
- **Production Ready:** Azure scales automatically with consumption plan
- **Monitoring:** Application Insights built-in for telemetry
- **Iteration Speed:** Deploy updates via Azure Functions Core Tools or VS Code
- **Orchestration Simplicity:** Durable Functions handles state/retries automatically

### Business Benefits
- **MVP Launch:** Can onboard real users immediately
- **Cost Tracking:** Monitor Azure OpenAI spend per run
- **Reliability Metrics:** Track completion rates, veto rates
- **Foundation for Growth:** Ready for Azure AD B2C, history, custom presets
- **Enterprise Ready:** Microsoft SLA, compliance (HIPAA, SOC 2)

---

## Risks & Mitigations

### Risk: Latency Exceeds 60 Seconds
**Impact:** Poor UX, users abandon  
**Mitigation:**
- Use GPT-4o (faster than GPT-4)
- Set low temperature (0.2) for consistency
- Parallel database writes where possible
- Add timeout monitoring + alerts

### Risk: Azure OpenAI Rate Limits
**Impact:** Failed runs during spikes  
**Mitigation:**
- Configure automatic retries in Durable Functions (max 3 attempts)
- Use Azure OpenAI deployment with sufficient TPM quota
- Monitor usage in Azure Monitor
- Implement queue-based throttling if needed

### Risk: CosmosDB Performance Issues
**Impact:** Slow queries, poor scaling  
**Mitigation:**
- Use partition key = run_id for single-document reads (fast)
- Configure indexing policy for status queries
- Monitor RU consumption in Azure Portal
- Start with 400 RU/s autoscale (scales to 4000 as needed)

### Risk: Frontend Breaking Changes
**Impact:** Mock API → Real API incompatibility  
**Mitigation:**
- Validate all response schemas match TypeScript types
- Test with real latency (not instant)
- Add error states for network failures
- Gradual rollout (feature flag if needed)

---

## Success Criteria

### Functional Requirements
- ✅ All 3 API endpoints deployed and responding
- ✅ Sequential agent pipeline executes correctly
- ✅ Conversation history passed between agents
- ✅ Veto logic stops pipeline at Assassin
- ✅ Frontend can poll and display results
- ✅ Database persistence works (survives refresh)

### Performance Requirements
- ✅ 95th percentile run time <60 seconds
- ✅ Database queries <200ms (p95)
- ✅ Zero data loss (all turns persisted)

### Quality Requirements
- ✅ Integration tests pass (5 agent scenarios)
- ✅ Veto scenario tested (stops at turn 3)
- ✅ Error handling tested (OpenAI timeout, rate limit)
- ✅ Monitoring dashboards configured

---

## Dependencies

### External Services
- **Azure Subscription:** Active subscription with sufficient quota
- **Azure OpenAI Service:** Approved access with GPT-4o deployment
- **Application Insights:** For monitoring (optional but recommended)

### Internal Prerequisites
- ✅ Frontend MVP complete (already done)
- ✅ All v2.0 specs aligned (already done)
- ✅ Agent prompts finalized in AGENT_ORCHESTRATION.md (already done)

### Team Requirements
- Backend developer with TypeScript/Node.js + Durable Functions experience
- Azure familiarity (Functions, CosmosDB, Azure OpenAI)
- Frontend developer for API integration (or same person)

---

## Implementation Plan

See [tasks.md](./tasks.md) for detailed task breakdown.

**Estimated Timeline:** 4 weeks (see REFINEMENT_ROADMAP.md)
- Week 1: Database + API endpoints (20 hours)
- Week 2: Agent orchestration (24 hours)
- Week 3: Frontend integration (16 hours)
- Week 4: Testing + deployment (16 hours)

**Total Effort:** ~76 hours (1-2 developers)

---

## Alternatives Considered

### Alternative 1: Supabase + PostgreSQL
**Pros:** Fast setup, good DX, built-in auth  
**Cons:** Less familiar for Microsoft-focused team, Deno runtime  
**Decision:** Rejected - Team prefers Azure/Microsoft stack

### Alternative 2: AWS Lambda + DynamoDB
**Pros:** Mature ecosystem, Step Functions orchestration  
**Cons:** Not Microsoft stack, more AWS-specific knowledge needed  
**Decision:** Rejected - Azure is preferred platform

### Alternative 3: Azure SQL + Manual Orchestration
**Pros:** Relational database familiarity  
**Cons:** Manual state management, more complex than CosmosDB document model  
**Decision:** Rejected - CosmosDB document model is more natural for conversation data

### Alternative 4: Keep Mock API, Add Backend Later
**Pros:** Frontend works now, defer complexity  
**Cons:** Cannot validate prompts, no real testing, blocks launch  
**Decision:** Rejected - Backend is critical path for MVP validation

---

## Open Questions

1. **Preflight Logic:** LLM-powered or rule-based for MVP?
   - **Recommendation:** Rule-based (check length, keywords) to save cost
   - **Future:** Upgrade to Azure OpenAI classifier

2. **Ranked Recommendations:** Who generates the 3 options?
   - **Recommendation:** Synthesizer outputs single recommendation, backend derives 3 from conversation
   - **Future:** Dedicate agent or post-processing step

3. **Agent Enable/Disable:** Include in MVP or defer?
   - **Recommendation:** Defer - frontend has UI but backend ignores for now
   - **Complexity:** Requires dynamic orchestrator logic

4. **Error Recovery:** Retry individual activity or full orchestration?
   - **Recommendation:** Durable Functions handles activity retries automatically (max 3 attempts)
   - **Failure:** Mark run as FAILED if all retries exhausted

5. **Azure OpenAI Deployment:** Single deployment or separate per region?
   - **Recommendation:** Single deployment in primary region for MVP
   - **Future:** Multi-region for geo-redundancy

---

## References

- [REFINEMENT_ROADMAP.md](../../REFINEMENT_ROADMAP.md) - Detailed timeline (update for Azure)
- [DEPLOYMENT.md](../../ai-ideas-lab/docs/DEPLOYMENT.md) - Deployment guide (update for Azure)
- [BACKEND_SPEC.md](../../ai-ideas-lab/docs/BACKEND_SPEC.md) - API contracts (stays the same)
- [AGENT_ORCHESTRATION.md](../../ai-ideas-lab/docs/AGENT_ORCHESTRATION.md) - Agent prompts (stays the same)
- [API_INTEGRATION.md](../../ai-ideas-lab/docs/API_INTEGRATION.md) - Frontend integration (update for Azure endpoints)
