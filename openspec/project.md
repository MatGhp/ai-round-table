# Project Context

## Purpose
**AI Round Table** is a Multi-Agent AI System for analyzing, critiquing, validating, and making decisions about ideas through structured disagreement and explicit veto mechanisms.

### Product Goals
- Create controlled intellectual conflict among AI agents
- Extract and validate assumptions through adversarial perspectives
- Enable "no" decisions via veto mechanism
- Support continue/stop decisions through sequential agent consensus

### Target Users
- Product Managers, Tech Leads, Startup Founders, Freelancers

## Tech Stack

### Frontend (✅ COMPLETE - MVP Ready)
- **Framework:** React 18 + Vite + TypeScript
- **UI Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS + class-variance-authority
- **State Management:** @tanstack/react-query
- **Internationalization:** i18next + i18next-browser-languagedetector
- **Date Handling:** date-fns
- **Form Management:** react-hook-form + zod

### Backend (❌ NOT IMPLEMENTED - Priority)
- **Platform:** Microsoft Azure
  - **Compute:** Azure Functions (HTTP Triggers + Durable Functions)
  - **Database:** Azure CosmosDB (NoSQL - document model)
  - **Orchestration:** Durable Functions (sequential orchestrator pattern)
  - **Storage:** CosmosDB (TTL-based cleanup)
- **AI Provider:** Azure OpenAI Service (GPT-4o, structured outputs mode)
- **Monitoring:** Application Insights (telemetry, errors, performance)
- **Orchestration:** Durable Functions (Refiner → Reality → Assassin → Cost → Synthesizer)

### Infrastructure
- **Hosting:** Azure Static Web Apps (frontend) or Vercel/Netlify
- **Backend:** Azure Functions (Consumption Plan or Premium)
- **Database:** Azure CosmosDB (serverless or provisioned throughput)
- **Monitoring:** Application Insights (errors, performance, traces)

## Project Conventions

### Code Style
- **TypeScript:** Strict mode enabled, explicit types preferred
- **Naming:**
  - Components: PascalCase (`ConversationThread.tsx`)
  - Functions/variables: camelCase (`getRunStatus`)
  - Constants: UPPER_SNAKE_CASE (`MAX_AGENTS`)
  - Files: kebab-case for non-components (`mock-api.ts`)
- **Imports:** Absolute paths via `@/` alias
- **Formatting:** Prettier defaults, 2-space indent

### Architecture Patterns

#### Frontend Architecture
- **Component Structure:** Atomic design principles
  - `src/components/` - Reusable UI components
  - `src/pages/` - Page-level components
  - `src/lib/` - Utilities, types, API client
- **State Management:** React Query for server state, local state for UI
- **Error Handling:** ErrorBoundary components + toast notifications

#### Backend Architecture (Planned)
- **Durable Functions Orchestration:** Sequential execution with automatic state persistence
- **Activity Functions:** Each agent is an activity (RefinerAgent, RealityCheckerAgent, etc.)
- **Document-Based Storage:** Single CosmosDB document per run with conversation array
- **Veto Pattern:** Orchestrator terminates early if Assassin returns veto=true
- **Async Execution:** HTTP trigger starts orchestrator, returns immediately; client polls GET endpoint
- **Database-First:** All conversation turns persisted to CosmosDB before proceeding

#### Agent Output Structure
Every agent produces TWO outputs:
1. **Conversational Message:** 100-250 words, max 700 chars, references previous agents
2. **Structured Output:** JSON matching agent's schema (concerns, recommendations, scores, etc.)

### Testing Strategy

#### Unit Tests (Target: 80% coverage)
- Agent prompt generation and validation
- Conversational message validation (max 700 chars)
- JSON schema validation for structured outputs
- Veto logic and pipeline termination

#### Integration Tests (Target: 70% coverage)
- Full agent pipeline (5 agents sequential)
- Conversation history passing between agents
- Database persistence of conversation turns
- Error handling and retry logic

#### E2E Tests (Critical paths only)
- Complete flow: idea submission → 5 agents → synthesis
- Veto scenario: stops at Assassin, no Cost/Synthesizer
- Preflight clarification flow

### Git Workflow
- **Branching:** Feature branches from `main` (`feature/add-conversation-threading`)
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`)
- **PRs:** Squash merge to main, delete branch after merge
- **Releases:** Semantic versioning (currently v2.0 - conversational architecture)

## Domain Context

### Core Concepts

#### Agent Roles (Sequential Execution)
1. **Refiner (1):** Clarifies and structures the idea, sets context
2. **Reality Checker (2):** Validates feasibility, identifies technical/market risks
3. **Assassin (3):** Adversarial critic, can VETO to stop pipeline
4. **Cost Analyst (4):** Estimates resources (time, money, team)
5. **Synthesizer (5):** Final verdict with recommendation

#### Conversation Architecture (v2.0)
- Agents execute sequentially, each sees full conversation history
- Each agent references previous agents explicitly in conversational message
- Conversation thread is PRIMARY UI (not secondary to structured data)
- Typing indicators show which agent is currently "thinking"

#### Veto Mechanism
- Only Assassin can veto
- When vetoed: `status: "VETOED"`, pipeline stops immediately
- Conversation includes 3 turns only (Refiner, Reality, Assassin)
- No Cost Analyst or Synthesizer runs

#### Preflight System
- Optional clarification questions before starting run
- Rule-based for MVP (check idea length, keywords)
- Returns i18n keys for questions/answers

### Key Business Rules
- Maximum conversational message length: 700 characters
- Total agents: 5 (fixed for MVP)
- Pipeline is sequential (no parallel execution)
- Once vetoed, run cannot be resumed
- All agent outputs must include both conversational + structured parts

## Important Constraints

### Technical Constraints
- **CosmosDB RU Limits:** Stay within 400 RU/s for MVP (autoscale to 4000 if needed)
- **Latency Target:** Complete run (5 agents) should finish in <60 seconds
- **Determinism:** Use low temperature (0.2) and seed for reproducible outputs
- **Rate Limiting:** Respect Azure OpenAI deployment TPM limits

### Product Constraints
- **MVP Scope:** No agent customization, no custom presets (future feature)
- **No Streaming:** Return complete responses only (no partial updates)
- **English First:** MVP supports English, i18n prepared for future languages
- **No User Accounts:** MVP is stateless (future: Azure AD B2C, user history)

### Cost Constraints
- Target cost per run: ~$0.50-$0.80 (5 agents × Azure OpenAI calls)
- Estimated 1000 runs/month = ~$475/month infrastructure cost
- Must track token usage per agent for cost analysis

## External Dependencies

### Primary Services
- **OpenAI API:** GPT-4o for agent inference (structured outputs mode)
- **Supabase:** Database, Edge Functions, authentication (future)
- **Lovable.dev:** Frontend hosting (or Vercel/Netlify)

### Development Tools
- **GitHub:** Version control, CI/CD via Actions
- **Sentry:** Error tracking and performance monitoring
- **PostHog:** Product analytics and feature flags

### Key Libraries
- **Zod:** Runtime schema validation (frontend + backend)
- **React Query:** Server state management and caching
- **i18next:** Internationalization framework
- **Tailwind CSS:** Utility-first styling

## Migration Notes

### Current State (December 2024)
- ✅ Frontend MVP complete (conversational UI, mock API)
- ✅ All specs aligned to v2.0 conversational architecture
- ❌ Backend not implemented (Supabase + Edge Functions pending)
- ❌ Real AI orchestration not implemented (agent prompts ready)

### Priority Work (Next 4 Weeks)
1. **Week 1:** Deploy database schema, implement API endpoints (preflight, create-run, get-run)
2. **Week 2:** Build agent orchestration pipeline with OpenAI integration
3. **Week 3:** Replace mockApi.ts with real API client, test with real latency
4. **Week 4:** Integration testing, staging deployment, production launch

See `REFINEMENT_ROADMAP.md` for detailed implementation plan.
