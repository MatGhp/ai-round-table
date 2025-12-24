# PRD-001: Azure Backend Implementation

**Product:** AI Round Table  
**Feature:** Production Backend Infrastructure  
**Version:** 1.0  
**Status:** Approved for Implementation  
**Created:** December 24, 2025  
**Priority:** P0 (Critical - Blocks MVP Launch)

---

## Executive Summary

Implement a production-ready backend for AI Round Table using Azure cloud services to replace the current mock API implementation. This enables real AI agent processing, persistent data storage, and scalable infrastructure for the conversational multi-agent evaluation system.

---

## Problem Statement

### Current State
- Frontend MVP is complete with full conversational UI
- All API interactions use `mockApi.ts` with simulated responses
- No persistence: runs disappear on page refresh
- No real AI processing: cannot validate agent prompts or conversation quality
- No production deployment path

### Pain Points
1. **Cannot validate product assumptions:** Mock data doesn't test if agent prompts produce coherent conversations
2. **Cannot demo to users:** No way to share persistent runs or showcase real AI interactions
3. **Cannot iterate on prompts:** No telemetry data to improve agent outputs
4. **Development friction:** Frontend changes require mock data updates

### Impact
- MVP cannot launch to real users
- Product decisions based on assumptions, not real AI behavior
- Cannot collect feedback on agent conversation quality
- Technical risk: unknown latency, cost, error patterns

---

## Goals & Success Metrics

### Primary Goals
1. **Replace Mock API:** All frontend API calls use real Azure backend
2. **Sequential Agent Pipeline:** 5 agents execute in order with conversation history
3. **Sub-60s Execution:** Complete 5-agent run finishes within 60 seconds
4. **Persistent Storage:** Runs survive page refresh, queryable for 30 days

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| API Availability | >99% | Application Insights uptime |
| P95 Latency | <60s | Orchestrator execution time |
| Conversation Quality | No truncated messages | Agent output validation |
| Cost per Run | <$0.50 | Azure OpenAI + CosmosDB costs |
| Error Rate | <5% | Failed runs / total runs |

### Out of Scope (Future PRDs)
- User authentication (Azure AD B2C)
- Run history and search
- Custom agent presets
- Streaming responses
- Multi-language support (English only for MVP)
- Analytics dashboard

---

## User Stories

### US-001: Submit Idea for Evaluation
**As a** Product Manager  
**I want to** submit my idea and receive a sequential conversation between 5 AI agents  
**So that** I can understand risks, assumptions, and viability from multiple perspectives

**Acceptance Criteria:**
- [ ] Idea text (10-5000 chars) submitted via POST /runs
- [ ] System returns run_id immediately (within 500ms)
- [ ] 5 agents execute sequentially (Refiner → Reality → Assassin → Cost → Synthesizer)
- [ ] Each agent references previous agents in conversational message
- [ ] Final status is COMPLETED or VETOED

---

### US-002: Monitor Run Progress
**As a** user waiting for my run to complete  
**I want to** see real-time progress as each agent finishes  
**So that** I know the system is working and not stuck

**Acceptance Criteria:**
- [ ] Frontend polls GET /runs/:id every 1-2 seconds
- [ ] Response includes conversation array with all completed turns
- [ ] Status field shows INIT → IN_PROGRESS → COMPLETED/VETOED
- [ ] Typing indicator shows current agent name

---

### US-003: Handle Veto Decision
**As a** user whose idea was vetoed by the Assassin agent  
**I want to** see the conversation stop immediately with clear reasoning  
**So that** I don't waste time waiting for Cost/Synthesizer when the idea is not viable

**Acceptance Criteria:**
- [ ] If Assassin returns veto=true, status → VETOED
- [ ] Conversation array contains exactly 3 turns (Refiner, Reality, Assassin)
- [ ] No Cost Analyst or Synthesizer runs
- [ ] Result object clearly shows veto reason

---

### US-004: Retrieve Past Runs
**As a** user who refreshed the page  
**I want to** access my previous run by ID  
**So that** I can review the conversation without losing my work

**Acceptance Criteria:**
- [ ] GET /runs/:id returns full document (even if COMPLETED)
- [ ] Run persists for 30 days (TTL configured)
- [ ] 404 returned if run_id doesn't exist or expired

---

## Technical Requirements

### Architecture Stack

**Compute:**
- Azure Functions (Consumption Plan)
- Durable Functions for orchestration
- Node.js 20+ runtime
- TypeScript

**Database:**
- Azure CosmosDB (NoSQL)
- Document model (one doc per run)
- Partition key: `id` (run identifier)
- Serverless capacity mode (MVP), autoscale later

**AI Services:**
- Azure OpenAI Service
- Model: GPT-4o (deployment name: `gpt-4o`)
- Structured outputs mode with JSON schema
- Temperature: 0.2 (deterministic)

**Observability:**
- Application Insights (logs, metrics, traces)
- Custom metrics: runs per hour, avg latency, veto rate
- Alert rules for error spikes

---

### API Specification

#### Endpoint 1: POST /preflight
**Purpose:** Optional validation and clarification questions before starting run

**Request:**
```json
{
  "idea_text": "string (10-5000 chars)",
  "preset_id": "default"
}
```

**Response:**
```json
{
  "preflight_id": "pf_2025-12-24_0001",
  "ready": false,
  "questions": [
    {
      "id": "q_target_user",
      "question": "questions.targetUser.question",
      "required": true,
      "default_answers": ["questions.targetUser.answers.productManager"]
    }
  ]
}
```

---

#### Endpoint 2: POST /runs
**Purpose:** Create run and start async orchestration

**Request:**
```json
{
  "idea_text": "string (10-5000 chars, required)",
  "preset_id": "default",
  "preflight_data": {
    "preflight_id": "pf_xxx",
    "answers": { "q_target_user": "Product Manager" }
  }
}
```

**Response (202 Accepted):**
```json
{
  "run_id": "run_2025-12-24_0001",
  "status": "INIT",
  "created_at": "2025-12-24T10:00:00Z"
}
```

---

#### Endpoint 3: GET /runs/:id
**Purpose:** Retrieve run status and conversation

**Response (200 OK):**
```json
{
  "run_id": "run_2025-12-24_0001",
  "status": "IN_PROGRESS",
  "idea_text": "Build a mobile app for water tracking",
  "conversation": [
    {
      "turn_number": 1,
      "agent_id": "refiner",
      "agent_name": "Refiner",
      "conversational_message": "I've structured your idea...",
      "structured_output": { "core_problem": "...", "target_user": "..." },
      "timestamp": "2025-12-24T10:00:01Z",
      "duration_ms": 1200
    }
  ],
  "result": null,
  "created_at": "2025-12-24T10:00:00Z",
  "updated_at": "2025-12-24T10:00:01Z"
}
```

---

### Database Schema (CosmosDB Document)

```json
{
  "id": "run_2025-12-24_0001",
  "status": "COMPLETED",
  "idea_text": "Build a mobile app for water tracking",
  "preset_id": "default",
  "conversation": [
    {
      "turn_number": 1,
      "agent_id": "refiner",
      "agent_name": "Refiner",
      "conversational_message": "I've structured your idea around hydration tracking...",
      "structured_output": {
        "core_problem": "People forget to drink water throughout the day",
        "target_user": "Health-conscious adults",
        "assumptions": ["Users have smartphones", "Users want to improve health"]
      },
      "timestamp": "2025-12-24T10:00:01Z",
      "duration_ms": 1200
    }
  ],
  "result": {
    "recommendation": "continue",
    "priority": "medium",
    "viability_score": 7.5,
    "summary": "..."
  },
  "metadata": {
    "total_duration_ms": 45000,
    "agent_count": 5,
    "veto_occurred": false,
    "openai_model": "gpt-4o",
    "openai_total_tokens": 8500
  },
  "created_at": "2025-12-24T10:00:00Z",
  "updated_at": "2025-12-24T10:00:45Z",
  "ttl": 2592000
}
```

**Partition Key:** `/id`  
**Indexing:** `/status`, `/created_at`, `/metadata/veto_occurred`  
**TTL:** 2592000 seconds (30 days)

---

## Orchestration Design (Durable Functions)

### Sequential Agent Pipeline

```typescript
// Pseudo-code orchestrator
async function* agentOrchestrator(context) {
  const { runId, ideaText } = context.df.getInput();
  const conversation = [];
  
  // Agent 1: Refiner
  const refiner = await context.df.callActivity("RefinerAgent", { ideaText, conversation });
  conversation.push(refiner);
  await persistTurn(runId, refiner);
  
  // Agent 2: Reality Checker
  const reality = await context.df.callActivity("RealityCheckerAgent", { ideaText, conversation });
  conversation.push(reality);
  await persistTurn(runId, reality);
  
  // Agent 3: Assassin (veto check)
  const assassin = await context.df.callActivity("AssassinAgent", { ideaText, conversation });
  conversation.push(assassin);
  await persistTurn(runId, assassin);
  
  if (assassin.structuredOutput.veto === true) {
    await updateRunStatus(runId, "VETOED");
    return; // Stop pipeline
  }
  
  // Agent 4: Cost Analyst
  const cost = await context.df.callActivity("CostAnalystAgent", { ideaText, conversation });
  conversation.push(cost);
  await persistTurn(runId, cost);
  
  // Agent 5: Synthesizer
  const synth = await context.df.callActivity("SynthesizerAgent", { ideaText, conversation });
  conversation.push(synth);
  await persistTurn(runId, synth);
  
  await finalizeRun(runId, synth.structuredOutput);
}
```

---

## Non-Functional Requirements

### Performance
- **Latency:** P95 < 60 seconds for full 5-agent run
- **Cold Start:** Accept 5-10s cold start for Consumption Plan (Premium Plan optimization later)
- **Throughput:** Support 10 concurrent runs (MVP scale)

### Reliability
- **Availability:** 99% uptime (Azure Functions SLA)
- **Error Handling:** Retry failed agent calls (3 attempts with exponential backoff)
- **Idempotency:** Duplicate POST /runs returns existing run_id

### Security
- **Secrets:** All keys in Azure Key Vault (CosmosDB, OpenAI, App Insights)
- **CORS:** Allow frontend domain only
- **Input Validation:** Sanitize idea_text, enforce length limits
- **Rate Limiting:** 10 runs per IP per hour (future: user-based quotas)

### Observability
- **Structured Logging:** JSON logs with correlation IDs
- **Metrics:** Custom metrics for veto rate, avg latency, cost per run
- **Traces:** Distributed tracing across orchestrator + activities
- **Alerts:** Error rate >10%, avg latency >90s, CosmosDB RU throttling

---

## Dependencies & Risks

### External Dependencies
1. **Azure OpenAI Service:** GPT-4o model availability in region
2. **CosmosDB:** Serverless capacity sufficient for MVP load
3. **Durable Functions:** Orchestrator storage (Azure Storage account)

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Azure OpenAI rate limits | High | High | Start with quota check, implement retry with backoff |
| CosmosDB RU throttling | Medium | Medium | Use serverless mode, add 429 retry logic |
| Durable Functions cold start | High | Low | Accept for MVP, document in UX ("first run may take 10s") |
| Agent prompt quality issues | Medium | High | Test prompts thoroughly, add validation for max 700 chars |
| Cost overruns | Low | Medium | Monitor daily spend, set budget alerts |

---

## Testing Strategy

### Unit Tests (Target: 80% coverage)
- Agent prompt generation and schema validation
- Conversational message length validation (<700 chars)
- Veto logic and pipeline termination
- CosmosDB document serialization

### Integration Tests (Target: 70% coverage)
- Full 5-agent pipeline (end-to-end orchestration)
- Veto scenario (stops at Assassin)
- Database persistence after each turn
- Error handling and retry logic

### Manual Testing (Critical Paths)
- Submit idea → receive 5-agent conversation
- Veto scenario → conversation stops at turn 3
- Page refresh → retrieve completed run by ID
- Invalid input → proper 400 error response

---

## Rollout Plan

### Phase 1: Local Development (Week 1)
- Azure infrastructure provisioned
- HTTP triggers implemented (preflight, create-run, get-run)
- CosmosDB CRUD operations working
- Frontend connects to local Functions (`http://localhost:7071`)

**Exit Criteria:** Frontend can create and retrieve runs locally

---

### Phase 2: Durable Functions (Week 2)
- Orchestrator with 5 sequential activity functions
- Azure OpenAI integration with structured outputs
- Conversation history builder
- Veto logic and error handling

**Exit Criteria:** Full 5-agent pipeline completes locally in <60s

---

### Phase 3: Azure Deployment (Week 3)
- Deploy Functions to Azure (Consumption Plan)
- Configure Application Insights
- Set up Azure Key Vault for secrets
- CORS and security hardening

**Exit Criteria:** Frontend (deployed to Vercel/Netlify) connects to production Azure backend

---

### Phase 4: Production Readiness (Week 4)
- Load testing (10 concurrent runs)
- Error monitoring and alerting
- Cost analysis and optimization
- Documentation and runbooks

**Exit Criteria:** System ready for controlled beta launch

---

## Open Questions

1. **Azure Region:** Should we use East US or another region for lower latency to target users?
2. **Authentication:** MVP launches without auth - acceptable for 2-week beta?
3. **Cost Budget:** What's the acceptable $/run cost ceiling?
4. **Scaling:** When do we migrate from Consumption to Premium Plan?

---

## Approval

**Product Manager:** [Name] – Approved  
**Tech Lead:** [Name] – Approved  
**Engineering Manager:** [Name] – Approved  

**Implementation Start Date:** December 24, 2025  
**Target MVP Launch:** January 15, 2026 (3 weeks)

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-24 | 1.0 | Initial PRD created |
