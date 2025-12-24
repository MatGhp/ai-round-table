# Architecture Documentation

**AI Round Table** - Multi-agent idea evaluation platform

Last Updated: 2025-12-24  
Version: 2.0 (Conversational Model)

---

## System Overview

### High-Level Architecture

```
┌─────────────────┐
│   Web Client    │
│ (React + Vite)  │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────────────────┐
│    Azure Functions (HTTP)           │
│  ┌──────────┬──────────┬─────────┐ │
│  │ Preflight│ CreateRun│ GetRun  │ │
│  └─────┬────┴────┬─────┴────┬────┘ │
│        │         │          │       │
│        └─────────┼──────────┘       │
│                  ↓                   │
│    ┌──────────────────────────┐    │
│    │  Durable Functions       │    │
│    │    Orchestrator          │    │
│    └──────────┬───────────────┘    │
│               │                     │
│     ┌─────────┴─────────┐          │
│     ↓                   ↓          │
│ Activity Functions   Activity      │
│  ┌─────────────┐    Functions      │
│  │ RefinerAgent│    (5 agents)     │
│  │RealityAgent │                   │
│  │AssassinAgent│    Azure OpenAI   │
│  │CostAnalyst  │    Integration    │
│  │Synthesizer  │                   │
│  └─────────────┘                   │
└──────────┬──────────────────────────┘
           │
           ↓
    ┌──────────────┐         ┌────────────────┐
    │  CosmosDB    │         │ Azure OpenAI   │
    │  (NoSQL)     │◄────────┤   GPT-4o       │
    │  Documents   │         │   (Chat API)   │
    └──────────────┘         └────────────────┘
           │
           ↓
    ┌──────────────┐
    │ Application  │
    │   Insights   │
    │ (Monitoring) │
    └──────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- shadcn/ui (component library)
- Tailwind CSS
- Lucide Icons

**Backend:**
- Azure Functions (Consumption Plan)
- Durable Functions (orchestration)
- Node.js runtime
- TypeScript

**Data Layer:**
- Azure CosmosDB (NoSQL, document model)
- Partition Key: `id` (run identifier)
- Auto-scaling: 400-4000 RU/s

**AI Services:**
- Azure OpenAI Service
- Model: GPT-4o
- Temperature: 0.2 (deterministic)

**Observability:**
- Application Insights (logs, metrics, traces)
- Custom dashboards
- Alert rules

---

## Frontend Architecture

### Component Hierarchy

```
App (Router)
├── LandingPage
│   ├── HeroSection
│   │   ├── IdeaInput (textarea)
│   │   └── EvaluateButton
│   ├── FeaturesSection
│   │   └── FeatureCard (5 agents)
│   └── ProcessSection
│       └── ProcessStep (timeline)
│
└── ResultsPage
    ├── ProgressIndicator (5 agents)
    ├── ConversationView
    │   └── AgentMessage
    │       ├── Avatar
    │       ├── ConversationalMessage
    │       └── StructuredOutput
    └── FinalRecommendation
        ├── ScoreDisplay
        └── ActionButtons
```

### State Management

- **Local State:** React `useState` for UI interactions
- **API State:** Direct fetch calls (no Redux/Zustand in MVP)
- **Navigation State:** React Router `useNavigate`
- **Error State:** Component-level error boundaries

### Routing Structure

```
/ (LandingPage)
  - Idea input form
  - Feature descriptions
  - Process explanation

/results/:runId (ResultsPage)
  - Polling status
  - Conversation display
  - Final recommendation
  - Error handling
```

### UI Component Library (shadcn/ui)

Used Components:
- `Button` (primary/secondary variants)
- `Card` (agent messages, features)
- `Badge` (agent status, confidence)
- `Textarea` (idea input)
- `Progress` (loading states)
- `Alert` (errors, warnings)

Design System:
- Color Palette: Primary blue, secondary purple, gray scale
- Typography: System fonts, clear hierarchy
- Spacing: Tailwind spacing scale (4px base)
- Responsiveness: Mobile-first (sm/md/lg breakpoints)

---

## Backend Architecture

### Azure Functions (HTTP Triggers)

#### 1. Preflight Function
```
GET /api/preflight
Response: { status: "ok", version: "2.0" }
```
Purpose: Health check, CORS support

#### 2. CreateRun Function
```
POST /api/runs
Body: { ideaDescription: string }
Response: { runId: string, status: "RUNNING" }
```
Purpose: Creates run document, starts orchestrator

#### 3. GetRun Function
```
GET /api/runs/:id
Response: { 
  runId: string,
  status: "RUNNING" | "COMPLETED" | "VETOED" | "FAILED",
  conversation: ConversationTurn[],
  result?: FinalResult 
}
```
Purpose: Client polling endpoint

### Durable Functions Orchestration

#### Orchestrator Pattern

```typescript
const orchestrator = df.orchestrator(function* (context) {
  const input = context.df.getInput();
  const conversation: ConversationTurn[] = [];

  // Turn 1: Refiner Agent
  const refiner = yield context.df.callActivity("RefinerAgent", {
    ideaDescription: input.ideaDescription
  });
  conversation.push(refiner);
  
  // Turn 2: Reality Checker Agent
  const reality = yield context.df.callActivity("RealityCheckerAgent", {
    ideaDescription: input.ideaDescription,
    conversationHistory: conversation
  });
  conversation.push(reality);
  
  // Turn 3: Assassin Agent (Veto Check)
  const assassin = yield context.df.callActivity("AssassinAgent", {
    ideaDescription: input.ideaDescription,
    conversationHistory: conversation
  });
  conversation.push(assassin);
  
  if (assassin.structuredOutput.veto) {
    // Early termination
    yield context.df.callActivity("UpdateRunDocument", {
      runId: input.runId,
      status: "VETOED",
      conversation,
      result: { recommendation: "REJECT", reason: assassin.structuredOutput.reason }
    });
    return;
  }
  
  // Turn 4: Cost Analyst Agent
  const cost = yield context.df.callActivity("CostAnalystAgent", {
    ideaDescription: input.ideaDescription,
    conversationHistory: conversation
  });
  conversation.push(cost);
  
  // Turn 5: Synthesizer Agent
  const synthesizer = yield context.df.callActivity("SynthesizerAgent", {
    ideaDescription: input.ideaDescription,
    conversationHistory: conversation
  });
  conversation.push(synthesizer);
  
  // Final Update
  yield context.df.callActivity("UpdateRunDocument", {
    runId: input.runId,
    status: "COMPLETED",
    conversation,
    result: synthesizer.structuredOutput
  });
});
```

#### Activity Functions (5 Agents)

Each agent is an Azure Function activity that:
1. Receives idea + conversation history
2. Formats prompt with system instructions
3. Calls Azure OpenAI (GPT-4o)
4. Parses conversational message + structured output
5. Returns `ConversationTurn` object

**Agent Responsibilities:**

| Agent | Purpose | Structured Output |
|-------|---------|-------------------|
| **Refiner** | Clarifies and improves idea | `{ clarifiedIdea: string, keyQuestions: string[] }` |
| **Reality Checker** | Validates feasibility | `{ feasibilityScore: number, challenges: string[] }` |
| **Assassin** | Identifies fatal flaws | `{ veto: boolean, reason?: string }` |
| **Cost Analyst** | Estimates resources | `{ estimatedCost: number, timeEstimate: string }` |
| **Synthesizer** | Final recommendation | `{ recommendation: "PROCEED"\|"REFINE"\|"REJECT", confidence: number }` |

### Error Handling & Retry Policies

**Orchestrator:**
- Automatic retry on activity failures (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- Timeout per activity: 30 seconds

**HTTP Triggers:**
- Validate input with Zod schemas
- Return 400 for invalid requests
- Return 404 for missing runs
- Return 500 for internal errors

**Azure OpenAI:**
- Retry on 429 (rate limit) with backoff
- Retry on 5xx (server errors)
- Timeout: 20 seconds per call
- Log all token usage to Application Insights

---

## Data Architecture

### CosmosDB Document Model

#### Run Document Schema

```typescript
interface RunDocument {
  id: string;                    // Partition key: "run_2025-12-24_0001"
  status: "RUNNING" | "COMPLETED" | "VETOED" | "FAILED";
  ideaDescription: string;
  conversation: ConversationTurn[];
  result?: {
    recommendation: "PROCEED" | "REFINE" | "REJECT";
    confidence: number;
    summary: string;
  };
  createdAt: string;             // ISO 8601
  updatedAt: string;
  ttl: number;                   // 30 days = 2592000 seconds
}

interface ConversationTurn {
  turnNumber: number;            // 1-5
  agentId: "refiner" | "reality" | "assassin" | "cost" | "synthesizer";
  conversationalMessage: string;
  structuredOutput: Record<string, any>;
  timestamp: string;
  tokensUsed?: number;
}
```

#### Example Document

```json
{
  "id": "run_2025-12-24_0001",
  "status": "COMPLETED",
  "ideaDescription": "A mobile app that uses AI to suggest recipes based on ingredients in your fridge",
  "conversation": [
    {
      "turnNumber": 1,
      "agentId": "refiner",
      "conversationalMessage": "I've refined your idea to focus on the core value...",
      "structuredOutput": {
        "clarifiedIdea": "AI-powered recipe suggestion app with image recognition...",
        "keyQuestions": ["How will you handle food safety?", "Will you support dietary restrictions?"]
      },
      "timestamp": "2025-12-24T10:30:00Z",
      "tokensUsed": 450
    },
    {
      "turnNumber": 2,
      "agentId": "reality",
      "conversationalMessage": "Let me assess the feasibility...",
      "structuredOutput": {
        "feasibilityScore": 7.5,
        "challenges": ["Computer vision accuracy", "Recipe database licensing"]
      },
      "timestamp": "2025-12-24T10:30:15Z",
      "tokensUsed": 520
    }
    // ... 3 more turns
  ],
  "result": {
    "recommendation": "PROCEED",
    "confidence": 8.2,
    "summary": "Strong product-market fit, technical challenges are manageable..."
  },
  "createdAt": "2025-12-24T10:30:00Z",
  "updatedAt": "2025-12-24T10:31:20Z",
  "ttl": 2592000
}
```

### Partition Key Strategy

- **Partition Key:** `id` (each run is a logical partition)
- **Why:** Natural isolation, no cross-partition queries needed
- **Cardinality:** High (every run is unique)
- **Size:** Small (<10KB per document)

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    { "path": "/status/?" },
    { "path": "/createdAt/?" }
  ],
  "excludedPaths": [
    { "path": "/conversation/*" },
    { "path": "/*" }
  ]
}
```

**Rationale:** Only query by `status` and `createdAt` (admin dashboard), not conversation content

### TTL Policy

- **Default TTL:** 30 days (2,592,000 seconds)
- **Cleanup:** Automatic (CosmosDB built-in)
- **Cost Savings:** Old runs auto-deleted, no manual cleanup

### Query Patterns

1. **Get Run by ID:** Point read (most efficient, 1 RU)
   ```typescript
   const { resource } = await container.item(runId, runId).read();
   ```

2. **List Recent Runs (Admin):** Query with pagination
   ```sql
   SELECT * FROM c WHERE c.status = 'COMPLETED' ORDER BY c.createdAt DESC
   ```

---

## Integration Points

### API Contracts

#### REST Endpoints

**Base URL (Development):** `http://localhost:7071/api`  
**Base URL (Production):** `https://func-ai-roundtable.azurewebsites.net/api`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/preflight` | GET | None | Health check, CORS |
| `/runs` | POST | None* | Create new evaluation |
| `/runs/:id` | GET | None* | Get run status |

*Future: Azure AD B2C tokens

#### Request/Response Schemas

**POST /runs**
```typescript
Request: {
  ideaDescription: string; // 10-5000 chars
}

Response (201): {
  runId: string;
  status: "RUNNING";
}

Errors:
- 400: Invalid input (missing/empty description)
- 500: Failed to start orchestrator
```

**GET /runs/:id**
```typescript
Response (200): {
  runId: string;
  status: "RUNNING" | "COMPLETED" | "VETOED" | "FAILED";
  conversation: ConversationTurn[];
  result?: FinalResult;
}

Errors:
- 404: Run not found
- 500: Database error
```

### Azure OpenAI Integration

**Configuration:**
- **Endpoint:** `https://<resource>.openai.azure.com/`
- **Deployment:** `gpt-4o-deployment`
- **API Version:** `2024-08-01-preview`
- **Authentication:** API Key (future: Managed Identity)

**Request Pattern:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-deployment",
  messages: [
    { role: "system", content: agentSystemPrompt },
    { role: "user", content: ideaDescription },
    ...conversationHistory.map(turn => ({
      role: "assistant",
      content: turn.conversationalMessage
    }))
  ],
  temperature: 0.2,
  max_tokens: 1000,
  response_format: { type: "json_object" }
});
```

**Rate Limiting:**
- TPM Limit: 150,000 tokens/minute
- RPM Limit: 1,000 requests/minute
- Retry Logic: Exponential backoff on 429

**Token Usage Tracking:**
```typescript
const tokensUsed = response.usage?.total_tokens || 0;
context.log.metric("TokensUsed", tokensUsed, {
  agentId: agentId,
  runId: runId
});
```

### Application Insights Telemetry

**Automatic Instrumentation:**
- HTTP request/response logs
- Function execution duration
- Exception tracking
- Dependency calls (CosmosDB, Azure OpenAI)

**Custom Metrics:**
```typescript
// Log custom events
context.log.event("AgentCompleted", {
  agentId: "refiner",
  tokensUsed: 450,
  duration: 2.3
});

// Log custom metrics
context.log.metric("ConversationLength", conversation.length);
context.log.metric("ConfidenceScore", result.confidence);
```

**Correlation:**
- Operation ID propagated through orchestration
- Trace parent/child relationships
- End-to-end request tracing

---

## Deployment Architecture

### Azure Resource Topology

```
Resource Group: rg-ai-roundtable
├── Azure Functions App
│   ├── Name: func-ai-roundtable
│   ├── Plan: Consumption (serverless)
│   ├── Runtime: Node.js 20 LTS
│   └── Region: East US
│
├── CosmosDB Account
│   ├── Name: cosmos-ai-roundtable
│   ├── API: NoSQL
│   ├── Consistency: Session
│   ├── Multi-region: No (MVP)
│   └── Database: ai-roundtable
│       └── Container: runs
│           ├── Partition Key: /id
│           └── Throughput: 400 RU/s (autoscale to 4000)
│
├── Azure OpenAI
│   ├── Name: openai-ai-roundtable
│   ├── Region: East US 2
│   └── Deployment: gpt-4o-deployment
│       ├── Model: gpt-4o
│       └── Capacity: 150K TPM
│
└── Application Insights
    ├── Name: appi-ai-roundtable
    └── Log Analytics Workspace: law-ai-roundtable
```

### Environment Strategy

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Local** | Development | Functions Core Tools (emulator), CosmosDB Emulator, Mock OpenAI |
| **Staging** | Pre-production testing | Azure (separate resource group), real services, lower limits |
| **Production** | Live users | Azure (prod resource group), full capacity, monitoring |

### Environment Variables

**Local (.env):**
```bash
COSMOSDB_ENDPOINT=https://localhost:8081
COSMOSDB_KEY=<emulator-key>
AZURE_OPENAI_ENDPOINT=http://localhost:8080/mock
AZURE_OPENAI_KEY=mock-key
APPLICATIONINSIGHTS_CONNECTION_STRING=<local-or-disabled>
```

**Staging/Production (Azure Configuration):**
```bash
COSMOSDB_ENDPOINT=https://cosmos-ai-roundtable.documents.azure.com
COSMOSDB_KEY=<secret-from-key-vault>
AZURE_OPENAI_ENDPOINT=https://openai-ai-roundtable.openai.azure.com
AZURE_OPENAI_KEY=<secret-from-key-vault>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-deployment
APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>
```

### CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
Trigger: Push to main branch
Steps:
  1. Checkout code
  2. Install Node.js 20
  3. npm install
  4. npm run lint
  5. npm run type-check
  6. npm run test
  7. npm run build (frontend + backend)
  8. Deploy Functions: az functionapp deployment
  9. Deploy Frontend: Azure Static Web Apps (or Vercel)
  10. Run smoke tests
  11. Notify team (success/failure)
```

**Deployment Approval:**
- Staging: Automatic on PR merge
- Production: Manual approval required

---

## Security & Compliance

### Authentication & Authorization

**MVP (Current):**
- No authentication (public API)
- Rate limiting by IP (future)

**Future (Phase 2):**
- Azure AD B2C for user authentication
- JWT tokens in Authorization header
- User-scoped run access (can only see own runs)
- Admin role for dashboard access

### Data Encryption

**In Transit:**
- HTTPS/TLS 1.2+ for all API calls
- Azure services use encrypted connections

**At Rest:**
- CosmosDB: Automatic encryption with Microsoft-managed keys
- Azure OpenAI: Data not stored (as per Azure OpenAI policy)
- Application Insights: Encrypted logs

### CORS Policies

**Development:**
```typescript
{
  allowedOrigins: ["http://localhost:5173"],
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 86400
}
```

**Production:**
```typescript
{
  allowedOrigins: ["https://ai-ideas-lab.vercel.app"],
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400
}
```

### Secrets Management

**Current (MVP):**
- Environment variables in Azure Functions configuration
- Manual secret rotation

**Future:**
- Azure Key Vault integration
- Managed Identity for service-to-service auth
- Automatic secret rotation (90 days)

### Data Retention & Privacy

- **User Data:** Idea descriptions stored for 30 days (TTL)
- **Logs:** Application Insights retains 90 days
- **PII:** No personal data collected in MVP
- **GDPR:** Future feature (user account deletion)

---

## Observability

### Logging Strategy

**Log Levels:**
- **Error:** Unhandled exceptions, API errors
- **Warning:** Retry attempts, rate limit approaching
- **Info:** Function start/complete, agent transitions
- **Debug:** Detailed prompts, API responses (dev only)

**Structured Logging:**
```typescript
context.log.info("Agent completed", {
  agentId: "refiner",
  runId: "run_2025-12-24_0001",
  tokensUsed: 450,
  duration: 2.3,
  success: true
});
```

### Metrics & Dashboards

**Key Metrics:**
1. **Request Metrics:**
   - Requests per minute
   - Success rate (2xx vs 4xx/5xx)
   - Response latency (p50, p95, p99)

2. **Orchestration Metrics:**
   - Runs started per hour
   - Runs completed vs failed
   - Average run duration
   - Veto rate (Assassin agent)

3. **AI Metrics:**
   - Tokens used per run
   - Tokens used per agent
   - OpenAI API errors
   - Retry count

4. **Database Metrics:**
   - RU consumption (avg, peak)
   - Document count
   - Query latency

5. **Cost Metrics:**
   - Daily Azure spend
   - Cost per run
   - OpenAI cost breakdown

**Application Insights Dashboard:**
```
┌────────────────────────────────────────┐
│ AI Round Table - Production Dashboard │
├────────────────────────────────────────┤
│ Requests/min: 42    Success Rate: 98%  │
│ Avg Latency: 25s    Runs/day: 1,248   │
├────────────────────────────────────────┤
│ OpenAI Tokens/day: 3.2M                │
│ CosmosDB RU/s: 320 (80% of limit)      │
│ Daily Cost: $15.83                     │
├────────────────────────────────────────┤
│ Agent Performance:                     │
│  Refiner:     2.1s avg  (450 tokens)   │
│  Reality:     2.3s avg  (520 tokens)   │
│  Assassin:    1.8s avg  (380 tokens)   │
│  Cost:        2.5s avg  (550 tokens)   │
│  Synthesizer: 3.2s avg  (720 tokens)   │
└────────────────────────────────────────┘
```

### Alerting Rules

**Critical Alerts (PagerDuty/Teams):**
- API success rate < 95% (5 min window)
- Function app unavailable (2 min)
- CosmosDB RU > 90% of limit (sustained 10 min)
- Azure OpenAI 429 errors > 10/min

**Warning Alerts (Email/Slack):**
- Response latency p95 > 60s
- Daily cost > $20
- Orchestrator failures > 5/hour

**Info Notifications:**
- Daily summary report
- Weekly cost report
- Monthly usage trends

---

## Performance Targets

### Latency

| Metric | Target | Current |
|--------|--------|---------|
| API Response (GET /runs/:id) | < 500ms | TBD |
| API Response (POST /runs) | < 1s | TBD |
| Full Run (5 agents) | < 60s | TBD |
| Single Agent Activity | < 5s | TBD |

### Throughput

| Metric | Target | Current |
|--------|--------|---------|
| Concurrent Runs | 100 | TBD |
| Requests per Second | 50 | TBD |
| Runs per Day | 10,000 | TBD |

### Resource Limits

| Resource | Limit | Monitoring |
|----------|-------|------------|
| CosmosDB RU/s | 400 (autoscale to 4000) | Application Insights |
| Azure OpenAI TPM | 150,000 | Retry count metric |
| Function Timeout | 10 min (orchestrator) | Duration metric |
| Document Size | 2 MB | Validation in code |

---

## Cost Estimation

### Monthly Cost Breakdown

| Service | Usage | Cost |
|---------|-------|------|
| **Azure Functions** | 1M executions, 10GB RAM | $20 |
| **CosmosDB** | 400 RU/s, 1GB storage | $50 |
| **Azure OpenAI** | 10M tokens/day | $400 |
| **Application Insights** | 5GB logs, 1M events | $5 |
| **Total** | | **$475/month** |

### Cost per Run

- **OpenAI Tokens:** 2620 tokens avg × $0.005/1K = $0.013
- **CosmosDB:** 10 RU × $0.00008/RU = $0.0008
- **Functions:** $0.0001
- **Total:** ~$0.014 per run

**At 1,000 runs/month:** $14 (plus fixed costs)

---

## Scalability Considerations

### Current Limits (MVP)

- 400 RU/s CosmosDB = ~40 concurrent runs
- 150K TPM Azure OpenAI = ~60 concurrent runs
- Functions Consumption = virtually unlimited

**Bottleneck:** Azure OpenAI TPM limit

### Scaling Strategy

**Phase 1 (0-1K runs/day):**
- Current architecture sufficient
- Monitor RU consumption

**Phase 2 (1K-10K runs/day):**
- Increase OpenAI deployment capacity (300K TPM)
- Enable CosmosDB autoscale to 4000 RU/s
- Add Application Insights sampling (25%)

**Phase 3 (10K+ runs/day):**
- Multiple OpenAI deployments (load balancing)
- CosmosDB provisioned throughput (manual control)
- Premium Functions plan (dedicated instances)
- Add Azure CDN for static assets

---

## Future Enhancements

### Phase 2 (Q1 2026)

- **User Authentication:** Azure AD B2C, saved run history
- **Custom Agents:** User-defined system prompts
- **Streaming Responses:** Server-sent events for real-time updates
- **Multi-language Support:** i18n (Spanish, French, German)

### Phase 3 (Q2 2026)

- **Agent Marketplace:** Community-contributed agent templates
- **Advanced Analytics:** Trend analysis, idea clustering
- **Team Workspaces:** Shared run history, collaboration
- **Export Options:** PDF reports, CSV data

### Phase 4 (Future)

- **Voice Input:** Speech-to-text for idea capture
- **Multi-modal AI:** Image analysis for product mockups
- **Integration APIs:** Webhooks, Zapier, Slack bot

---

## References

- [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
- [Durable Functions Patterns](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview)
- [CosmosDB Best Practices](https://learn.microsoft.com/azure/cosmos-db/nosql/best-practice-dotnet)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)

---

**Document Maintenance:**
- Update after each major architectural change
- Review quarterly for accuracy
- Archive old versions in `/docs/archive/architecture-v1.md`
