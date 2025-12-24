# Development Rules & Standards

**AI Round Table** - Project governance and quality standards

Last Updated: 2025-12-24

---

## 🔄 1. OpenSpec Workflow (PRIMARY)

**All code changes MUST follow the OpenSpec process:**

### Creating Changes
```bash
# Step 1: Create a new change proposal
openspec new <change-name>

# Step 2: Write proposal.md (what/why/how)
# Include: summary, desired state, architecture, risks

# Step 3: Create tasks.md (implementation steps)
# Break into 1-4 week milestones

# Step 4: Add spec deltas (affected requirements)
# Create /specs/<area>/spec.md with ADDED/CHANGED/REMOVED

# Step 5: Validate before implementation
openspec validate <change-name>
```

### Implementing Changes
```bash
# Step 1: Create feature branch
git checkout -b feature/<change-name>

# Step 2: Follow tasks.md sequentially
# Check off tasks as completed

# Step 3: Update project.md if tech stack changes
# Keep conventions current

# Step 4: Test at each milestone
# Unit → Integration → E2E

# Step 5: Create PR with OpenSpec link
# PR description: "Implements openspec/changes/<change-name>"
```

### Completing Changes
```bash
# After PR merge:
openspec archive <change-name>

# Move to openspec/archive/<change-name>/
# Keep history for future reference
```

### Rules
- ❌ NO direct code changes without OpenSpec proposal
- ❌ NO "quick fixes" that bypass the process
- ✅ Small changes = short proposal (5-10 lines OK)
- ✅ Emergency fixes = create proposal retroactively
- ✅ Always validate before starting implementation

---

## 🌿 2. Git Workflow

### Branch Naming
```
feature/<change-name>    # New features (matches OpenSpec)
fix/<issue-description>  # Bug fixes
hotfix/<critical-fix>    # Production emergencies
docs/<doc-update>        # Documentation only
```

**Examples:**
- `feature/implement-azure-backend`
- `fix/cosmos-connection-timeout`
- `hotfix/openai-rate-limit-crash`
- `docs/update-deployment-guide`

### Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Build/tooling changes

**Examples:**
```
feat(backend): add Durable Functions orchestrator

Implements sequential agent execution with automatic
state persistence and retry logic.

Relates to: openspec/changes/implement-azure-backend
```

```
fix(frontend): handle 429 rate limit errors

Add exponential backoff when polling API returns
rate limit errors. Max 5 retries with 2s/4s/8s delays.

Fixes: #42
```

### Pull Request Requirements

**Before Creating PR:**
- [ ] All tasks in OpenSpec tasks.md completed
- [ ] Code linted (`npm run lint`)
- [ ] Type checking passed (`npm run type-check`)
- [ ] Tests added and passing (`npm test`)
- [ ] Documentation updated (README, architecture.md)

**PR Template:**
```markdown
## OpenSpec Reference
openspec/changes/<change-name>

## Changes
- Brief bullet points of what changed

## Testing
- How this was tested (unit/integration/manual)

## Deployment Notes
- Any special deployment steps
- Environment variable changes
- Database migrations

## Screenshots (if UI change)
[Add screenshots]
```

**Review Requirements:**
- Minimum 1 approval (2 for breaking changes)
- All CI checks passed (lint, type, test)
- No merge conflicts
- OpenSpec proposal matches implementation

### Branch Protection
- `main` branch is protected
- No direct pushes to `main`
- Require PR reviews
- Require CI checks to pass
- Squash merge preferred (clean history)

---

## 📝 3. Code Standards

### TypeScript

**Strict Mode:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Rules:**
- ❌ NO `any` types (use `unknown` or proper types)
- ❌ NO ignored errors (`@ts-ignore` without justification)
- ✅ Use explicit return types for functions
- ✅ Use interfaces for complex objects
- ✅ Use type guards for narrowing

**Examples:**

❌ **Bad:**
```typescript
function processData(data: any) {
  return data.map((item: any) => item.value);
}
```

✅ **Good:**
```typescript
interface DataItem {
  value: string;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

### Function Complexity

**Rules:**
- Max 20 lines per function (excluding types/comments)
- Max 3 levels of nesting
- Extract complex logic to helper functions
- Use early returns to reduce nesting

**Example:**

❌ **Bad:**
```typescript
function evaluateIdea(idea: string) {
  if (idea) {
    if (idea.length > 10) {
      if (idea.includes("AI")) {
        return "Good idea";
      } else {
        return "Needs AI";
      }
    } else {
      return "Too short";
    }
  } else {
    return "Invalid";
  }
}
```

✅ **Good:**
```typescript
function evaluateIdea(idea: string): string {
  if (!idea) return "Invalid";
  if (idea.length <= 10) return "Too short";
  
  return idea.includes("AI") ? "Good idea" : "Needs AI";
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Variables** | camelCase | `conversationHistory` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Functions** | camelCase (verb) | `createRun()`, `getRunStatus()` |
| **Interfaces** | PascalCase | `ConversationTurn` |
| **Types** | PascalCase | `AgentId`, `RunStatus` |
| **Components** | PascalCase | `AgentMessage`, `ResultsPage` |
| **Files** | kebab-case | `agent-message.tsx`, `api-client.ts` |

### File Organization

**Frontend:**
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── features/        # Feature-specific components
├── lib/
│   ├── api.ts           # API client
│   └── utils.ts         # Helper functions
├── pages/
│   ├── landing-page.tsx
│   └── results-page.tsx
├── types/
│   └── api.types.ts     # Shared types
└── App.tsx
```

**Backend:**
```
src/
├── functions/
│   ├── preflight.ts     # HTTP trigger
│   ├── create-run.ts    # HTTP trigger
│   └── get-run.ts       # HTTP trigger
├── orchestrators/
│   └── run-orchestrator.ts
├── activities/
│   ├── refiner-agent.ts
│   ├── reality-agent.ts
│   └── ...
├── lib/
│   ├── cosmos-client.ts
│   ├── openai-client.ts
│   └── types.ts
└── tests/
    └── ...
```

---

## 🧪 4. Testing Requirements

### Coverage Targets

| Layer | Target | Current |
|-------|--------|---------|
| **Unit Tests** | 80% | TBD |
| **Integration Tests** | All endpoints | TBD |
| **E2E Tests** | Critical flows | TBD |

### Unit Tests

**Rules:**
- Test pure functions first (high ROI)
- Mock external dependencies (Azure services)
- One assertion per test (DAMP not DRY)
- Descriptive test names: `should_<expected>_when_<condition>`

**Example:**
```typescript
describe("formatConversationHistory", () => {
  it("should_format_single_turn_correctly", () => {
    const turns = [{ turnNumber: 1, agentId: "refiner", ... }];
    const result = formatConversationHistory(turns);
    expect(result).toContain("Turn 1: Refiner Agent");
  });

  it("should_handle_empty_array", () => {
    const result = formatConversationHistory([]);
    expect(result).toBe("");
  });
});
```

### Integration Tests

**Required Tests:**
- All HTTP endpoints (preflight, create-run, get-run)
- Durable Functions orchestrator (mocked activities)
- CosmosDB operations (create, read, update)
- Azure OpenAI integration (with retry logic)

**Example:**
```typescript
describe("POST /api/runs", () => {
  it("should_create_run_and_start_orchestrator", async () => {
    const response = await request(app)
      .post("/api/runs")
      .send({ ideaDescription: "Test idea" });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("runId");
    expect(response.body.status).toBe("RUNNING");
  });

  it("should_return_400_for_invalid_input", async () => {
    const response = await request(app)
      .post("/api/runs")
      .send({ ideaDescription: "" });
    
    expect(response.status).toBe(400);
  });
});
```

### E2E Tests

**Critical Flows:**
1. **Happy Path:** Submit idea → Poll until complete → Display results
2. **Veto Path:** Submit idea → Assassin vetoes → Show rejection
3. **Error Path:** Submit idea → OpenAI fails → Show error message
4. **Polling Timeout:** Submit idea → 5 min timeout → Show timeout

**Tools:**
- Playwright or Cypress (TBD)
- Run against staging environment
- Automated in CI/CD pipeline

---

## ☁️ 5. Azure-Specific Rules

### CosmosDB

**Rules:**
- Always use partition key in queries (avoid cross-partition)
- Monitor RU consumption in Application Insights
- Stay under 400 RU/s (autoscale if needed)
- Use point reads when possible (1 RU vs 10+ RU for queries)

**Example:**
```typescript
// ✅ Good: Point read (1 RU)
const { resource } = await container.item(runId, runId).read();

// ❌ Bad: Query without partition key (expensive)
const { resources } = await container.items
  .query("SELECT * FROM c WHERE c.status = 'RUNNING'")
  .fetchAll();
```

**Monitoring:**
- Daily alert if RU > 350 (90% of limit)
- Weekly review of query patterns
- Monthly cost analysis

### Azure OpenAI

**Rules:**
- Always use `temperature: 0.2` for determinism
- Set `max_tokens` to prevent runaway costs
- Use `response_format: { type: "json_object" }` for structured output
- Retry on 429 (rate limit) with exponential backoff
- Log all token usage to Application Insights

**Example:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-deployment",
  messages: [...],
  temperature: 0.2,              // ✅ Deterministic
  max_tokens: 1000,               // ✅ Cost control
  response_format: { type: "json_object" },  // ✅ Structured
  // ❌ NO temperature > 0.5 (too random)
  // ❌ NO streaming in orchestrator (state issues)
});

// ✅ Always log tokens
context.log.metric("TokensUsed", response.usage.total_tokens, {
  agentId: agentId,
  runId: runId
});
```

**Rate Limit Handling:**
```typescript
async function callOpenAIWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### Durable Functions

**Rules:**
- Orchestrators MUST be deterministic (no random, Date.now(), etc.)
- Use `context.df.currentUtcDateTime` instead of `new Date()`
- NO external calls in orchestrators (use activities)
- Keep orchestrators < 100 lines (extract logic to activities)
- Always handle activity failures gracefully

**Example:**

❌ **Bad (Non-deterministic):**
```typescript
const orchestrator = df.orchestrator(function* (context) {
  const now = new Date();  // ❌ Non-deterministic
  const randomId = Math.random();  // ❌ Non-deterministic
  
  const result = await fetch("...");  // ❌ External call in orchestrator
});
```

✅ **Good:**
```typescript
const orchestrator = df.orchestrator(function* (context) {
  const now = context.df.currentUtcDateTime;  // ✅ Deterministic
  const input = context.df.getInput();
  
  const result = yield context.df.callActivity("FetchData", {...});  // ✅ Activity
});
```

### Application Insights

**Rules:**
- Log all errors with context (runId, agentId, etc.)
- Use custom metrics for business KPIs
- Set correlation IDs for distributed tracing
- Sample logs in production (25% to reduce cost)

**Example:**
```typescript
// ✅ Structured logging
context.log.error("Agent failed", {
  error: error.message,
  stack: error.stack,
  runId: runId,
  agentId: agentId,
  retryCount: retryCount
});

// ✅ Custom metrics
context.log.metric("AgentDuration", durationMs, {
  agentId: agentId,
  success: true
});

// ✅ Custom events
context.log.event("RunCompleted", {
  runId: runId,
  totalDuration: durationMs,
  agentCount: 5,
  vetoOccurred: false
});
```

---

## 📚 6. Documentation Requirements

### Code Documentation

**Rules:**
- All exported functions/classes have JSDoc comments
- Complex logic has inline comments (why, not what)
- README.md in each major directory

**Example:**
```typescript
/**
 * Formats conversation history for OpenAI prompt.
 * 
 * Converts ConversationTurn array into a readable string
 * with turn numbers, agent names, and messages.
 * 
 * @param turns - Array of conversation turns
 * @returns Formatted string for prompt injection
 * 
 * @example
 * const history = formatConversationHistory([
 *   { turnNumber: 1, agentId: "refiner", ... }
 * ]);
 * // Returns: "Turn 1: Refiner Agent\n..."
 */
export function formatConversationHistory(
  turns: ConversationTurn[]
): string {
  // ... implementation
}
```

### Architecture Documentation

**Update `architecture.md` when:**
- Adding new Azure services
- Changing data models
- Modifying API contracts
- Updating deployment process

**Update `rules.md` when:**
- Changing development workflow
- Adding new coding standards
- Modifying testing requirements

### API Documentation

**OpenAPI Spec (Future):**
- Document all REST endpoints
- Include request/response schemas
- Add example payloads
- Host on Swagger UI

**Current (MVP):**
- Inline comments in API client
- Examples in README.md

### Environment Variables

**Document in README.md:**
```markdown
## Environment Variables

### Required
- `COSMOSDB_ENDPOINT` - CosmosDB account URL
- `COSMOSDB_KEY` - CosmosDB access key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT_NAME` - GPT-4o deployment name

### Optional
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Monitoring (auto-set in Azure)
- `LOG_LEVEL` - `debug` | `info` | `warn` | `error` (default: `info`)
```

---

## 🚀 7. Deployment Rules

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Environment variables configured
- [ ] Secrets added to Azure Key Vault (production)
- [ ] Staging deployment successful
- [ ] Smoke tests passed in staging
- [ ] Performance tests passed (if applicable)
- [ ] Rollback plan documented

### Deployment Process

**Staging:**
```bash
# Automated on PR merge to main
git push origin main
# GitHub Actions:
# 1. Build frontend + backend
# 2. Deploy to staging Functions app
# 3. Deploy frontend to staging URL
# 4. Run smoke tests
# 5. Notify team in Slack
```

**Production:**
```bash
# Manual approval required
# 1. Review staging results
# 2. Approve in GitHub Actions UI
# 3. Deploy to production Functions app
# 4. Deploy frontend to production URL
# 5. Run smoke tests
# 6. Monitor Application Insights (30 min)
# 7. Send deployment summary
```

### Deployment Windows

- **Staging:** Anytime (24/7)
- **Production:** Monday-Thursday, 9 AM - 5 PM (avoid Friday/weekends)
- **Hotfixes:** Anytime with approval

### Rollback Procedure

**If deployment fails:**
```bash
# Step 1: Identify issue (Application Insights)
# Step 2: Decide rollback vs forward-fix
# Step 3: Rollback to previous deployment slot
az functionapp deployment slot swap \
  --resource-group rg-ai-roundtable \
  --name func-ai-roundtable \
  --slot production \
  --target-slot staging

# Step 4: Verify health checks
# Step 5: Investigate root cause
# Step 6: Create hotfix or schedule fix
```

**Rollback Triggers:**
- Error rate > 10% (5 min window)
- Response latency > 2x baseline
- Complete API outage
- Data corruption detected

---

## 🎯 8. Quality Gates

### CI/CD Pipeline

**On Every Push:**
```yaml
1. Install dependencies (npm ci)
2. Lint (npm run lint)
   - ESLint for code quality
   - Prettier for formatting
3. Type Check (npm run type-check)
   - TypeScript compiler
4. Unit Tests (npm test)
   - Jest with coverage report
   - Minimum 80% coverage
5. Build (npm run build)
   - Frontend: Vite build
   - Backend: TypeScript compile
```

**On PR to Main:**
```yaml
All above steps +
6. Integration Tests (npm run test:integration)
   - API endpoint tests
   - Database operations
7. E2E Tests (npm run test:e2e)
   - Critical user flows
8. Security Scan (npm audit)
   - No high/critical vulnerabilities
9. Bundle Size Check
   - Frontend < 500KB gzipped
```

**On Production Deploy:**
```yaml
All above steps +
10. Smoke Tests (staging)
    - Health check endpoints
    - Sample run creation
11. Performance Tests
    - Latency benchmarks
    - Load test (100 concurrent users)
12. Manual QA Approval
    - Product owner sign-off
```

### Code Review Checklist

**Reviewer Responsibilities:**
- [ ] Code matches OpenSpec proposal
- [ ] Tests added for new functionality
- [ ] No security vulnerabilities (secrets, SQL injection, XSS)
- [ ] Performance considerations addressed
- [ ] Error handling comprehensive
- [ ] Documentation updated
- [ ] No unnecessary complexity
- [ ] Follows project conventions

**Approval Criteria:**
- All CI checks green
- 1+ approval (2 for breaking changes)
- No unresolved comments
- PR description clear

---

## 💰 9. Cost Management

### Monitoring

**Weekly Review:**
- Check Azure Cost Management dashboard
- Compare actual vs estimated ($475/month)
- Identify anomalies (sudden spikes)

**Monthly Review:**
- Detailed cost breakdown by service
- Cost per run analysis
- Optimization opportunities

### Cost Alerts

**Azure Monitor Alerts:**
- Daily spend > $20 (warning)
- Daily spend > $30 (critical)
- CosmosDB RU throttling (cost inefficiency)
- OpenAI token usage > 12M/day (warning)

### Optimization Strategies

**If costs exceed budget:**
1. **Reduce OpenAI calls:**
   - Implement caching for similar ideas
   - Reduce max_tokens limits
   - Use GPT-3.5 for non-critical agents

2. **Optimize CosmosDB:**
   - Review indexing policy (remove unused indexes)
   - Reduce autoscale max (4000 → 2000 RU/s)
   - Implement request rate limiting

3. **Reduce Application Insights:**
   - Increase sampling rate (25% → 10%)
   - Reduce log retention (90 → 30 days)

---

## 🔐 10. Security Rules

### Secrets Management

**Rules:**
- ❌ NO secrets in code (ever)
- ❌ NO secrets in git history
- ❌ NO `.env` files committed
- ✅ Use environment variables
- ✅ Use Azure Key Vault in production
- ✅ Rotate secrets every 90 days

**Check Before Commit:**
```bash
# Add to .gitignore
.env
.env.local
*.pem
*.key
secrets.json
```

### Dependency Security

**Rules:**
- Run `npm audit` weekly
- Fix high/critical vulnerabilities immediately
- Update dependencies monthly
- Use Dependabot for automated PRs

**Example:**
```bash
# Check vulnerabilities
npm audit

# Fix automatically (low risk)
npm audit fix

# Fix with breaking changes (test first)
npm audit fix --force
```

### Input Validation

**Rules:**
- Validate ALL user input (Zod schemas)
- Sanitize before database operations
- Use parameterized queries (prevent injection)
- Set max input lengths

**Example:**
```typescript
import { z } from "zod";

const CreateRunSchema = z.object({
  ideaDescription: z.string()
    .min(10, "Idea too short")
    .max(5000, "Idea too long")
    .trim()
});

// Validate
const result = CreateRunSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

---

## 🚨 11. Emergency Procedures

### Production Incident Response

**Severity Levels:**

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0** | Complete outage | 15 min | API down, database unavailable |
| **P1** | Degraded service | 1 hour | Slow response, high error rate |
| **P2** | Minor issue | 24 hours | Cosmetic bug, non-critical feature |

**Incident Process:**
1. **Detect:** Application Insights alert or user report
2. **Triage:** Assess severity, assign owner
3. **Mitigate:** Rollback or hotfix
4. **Communicate:** Update status page, notify users
5. **Resolve:** Fix root cause
6. **Postmortem:** Document learnings (within 48 hours)

### On-Call Rotation

**Coverage:** 24/7 (future, when user base grows)
**Rotation:** Weekly shifts
**Escalation:** P0 → All hands, P1 → Primary + backup

---

## 📊 12. Metrics & KPIs

### Development Metrics

- **Deployment Frequency:** Target 2-3/week
- **Lead Time:** PR merge to production < 24 hours
- **MTTR (Mean Time to Repair):** < 1 hour for P1 incidents
- **Change Failure Rate:** < 10%

### Product Metrics

- **Runs per Day:** Growth rate (10% MoM target)
- **Success Rate:** > 95% (completed runs)
- **Veto Rate:** Track over time (should stabilize)
- **User Satisfaction:** NPS score (future)

---

## 📖 13. Learning & Improvement

### Retrospectives

**Weekly (Team):**
- What went well?
- What could improve?
- Action items (assign owners)

**Monthly (Project):**
- Review OpenSpec proposals archived
- Analyze metrics trends
- Update architecture.md / rules.md

### Knowledge Sharing

- Document decisions in ADRs (Architecture Decision Records)
- Share learnings in team wiki
- Brown bag sessions for new tech

---

## ✅ Summary Checklist

Before starting any work, verify:
- [ ] OpenSpec proposal exists and validated
- [ ] Feature branch created from main
- [ ] Development environment set up
- [ ] All rules understood and agreed

Before submitting PR:
- [ ] All tasks in tasks.md completed
- [ ] Tests added and passing (80% coverage)
- [ ] Code linted and type-checked
- [ ] Documentation updated
- [ ] OpenSpec proposal matches implementation

Before deploying to production:
- [ ] Staging deployment successful
- [ ] Smoke tests passed
- [ ] Manual QA approved
- [ ] Rollback plan documented
- [ ] Team notified

---

**Exceptions:**
- Rules can be broken with justification (document in PR)
- Emergency hotfixes can bypass OpenSpec (create proposal retroactively)
- Product owner can grant exceptions for deadlines

**Enforcement:**
- CI/CD pipeline enforces automated checks
- Code reviews enforce manual checks
- Team retrospectives address violations

---

**Questions?**
- Discuss in team Slack channel
- Propose rule changes via OpenSpec proposal
- Update this document quarterly
