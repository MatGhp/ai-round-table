# Week 3 Implementation Plan

**Status:** Week 2 Complete ✅ - Backend Fully Functional  
**Last Updated:** December 24, 2025  
**Current Commit:** `8661460`

---

## 📊 Architecture Analysis - What We Have Built

### ✅ Backend Implementation (100% Complete)

**Infrastructure Layer:**
- Azure Functions runtime configured
- Durable Functions support enabled
- CosmosDB client with CRUD operations
- Azure OpenAI client with retry logic

**HTTP Endpoints (3/3):**
- ✅ `POST /api/preflight` - Health check and validation
- ✅ `POST /api/runs` - Create run + start orchestrator
- ✅ `GET /api/runs/:id` - Retrieve run with status

**Agent System (5/5 Agents):**
- ✅ Refiner Agent - Structures raw ideas
- ✅ Reality Checker Agent - Challenges assumptions
- ✅ Assassin Agent - Veto power for flawed ideas
- ✅ Cost Analyst Agent - Evaluates implementation costs
- ✅ Synthesizer Agent - Final recommendation

**Orchestration Layer:**
- ✅ Agent Pipeline Orchestrator (Durable Functions)
- ✅ Sequential execution: Refiner → Reality → Assassin → Cost → Synthesizer
- ✅ Veto logic with early termination
- ✅ Status transitions: INIT → AGENTS_RUNNING → SYNTHESIZING → COMPLETED/VETOED
- ✅ CosmosDB persistence at each stage

**Helper Activities (3/3):**
- ✅ UpdateRunStatus - Status field updates
- ✅ AppendTurn - Add conversation turns to array
- ✅ FinalizeRun - Create run_result document

**Testing Infrastructure:**
- ✅ Integration test suite (`test-integration.ps1`)
- ✅ Quick test script (`test-quick.ps1`)
- ✅ Testing documentation (`TESTING.md`)

**Key Files Implemented:**
```
azure-backend/
├── src/
│   ├── functions/
│   │   ├── preflight.ts          ✅ Health check endpoint
│   │   ├── create-run.ts         ✅ Create run + start orchestrator
│   │   └── get-run.ts            ✅ Retrieve run status
│   ├── activities/
│   │   ├── refiner-agent.ts      ✅ Agent 1
│   │   ├── reality-agent.ts      ✅ Agent 2
│   │   ├── assassin-agent.ts     ✅ Agent 3
│   │   ├── cost-agent.ts         ✅ Agent 4
│   │   ├── synthesizer-agent.ts  ✅ Agent 5
│   │   ├── update-run-status.ts  ✅ Helper activity
│   │   ├── append-turn.ts        ✅ Helper activity
│   │   ├── finalize-run.ts       ✅ Helper activity
│   │   └── index.ts              ✅ Activity registration
│   ├── orchestrators/
│   │   └── agent-pipeline.ts     ✅ Main orchestrator
│   ├── prompts/
│   │   └── agents.ts             ✅ System prompts for all 5 agents
│   ├── lib/
│   │   ├── cosmos-client.ts      ✅ CosmosDB CRUD
│   │   ├── openai-client.ts      ✅ Azure OpenAI integration
│   │   ├── schemas.ts            ✅ Zod validation
│   │   └── utils.ts              ✅ Utilities
│   └── index.ts                  ✅ Entry point
├── test-integration.ps1          ✅ Full test suite
├── test-quick.ps1                ✅ Quick test
├── TESTING.md                    ✅ Test documentation
└── package.json                  ✅ Dependencies
```

---

## 🔍 Gap Analysis - What's Missing

### ❌ Frontend Implementation (0% Complete)

**Current Status:** Frontend repo exists but no React code implemented

**Missing Components:**
1. **Landing Page:**
   - Idea input form (textarea)
   - Submit button
   - Feature showcase (5 agents)
   - Process explanation

2. **Results Page:**
   - Run status polling
   - Conversation display (chat interface)
   - Agent avatars and messages
   - Structured output display
   - Final recommendation card
   - Decision badges

3. **Routing:**
   - `/` → Landing page
   - `/results/:runId` → Results page with polling

4. **API Integration:**
   - Fetch calls to Azure Functions
   - Polling logic (5s intervals)
   - Error handling
   - Loading states

5. **UI Components:**
   - Agent message cards
   - Progress indicators
   - Badges (status, confidence)
   - Buttons (primary/secondary)
   - Alerts (errors)

### ⚠️ Backend Enhancements Needed

1. **CORS Configuration:**
   - Currently: Anonymous access, default CORS
   - Needed: Explicit CORS rules for frontend domain

2. **Error Responses:**
   - Currently: Basic error messages
   - Needed: Structured error objects with codes

3. **Preflight Enhancement:**
   - Currently: Returns static `ready: true`
   - PRD requires: Expert Clarifier agent for missing details
   - **Decision:** Defer to Phase 2 (MVP can skip clarification questions)

4. **Observability:**
   - Currently: Basic console logging
   - Needed: Application Insights integration, custom metrics

5. **Environment Configuration:**
   - Currently: `local.settings.json` (manual)
   - Needed: Template file with instructions

### 🚀 Deployment Infrastructure (0% Complete)

**Missing:**
- Azure deployment scripts
- GitHub Actions CI/CD pipeline
- Infrastructure as Code (Bicep/ARM templates)
- Static web app hosting for frontend
- Environment variable management

---

## 📋 Week 3 Priorities - Frontend Development

### Goal: Functional MVP with Frontend

**Estimated Duration:** 24-32 hours

### Task Breakdown

#### **Task 1: React Project Setup** (2 hours)
**Objective:** Initialize React + Vite project with TypeScript

**Subtasks:**
1. Verify Vite project structure in `ai-ideas-lab/`
2. Install dependencies: React Router, Axios/Fetch, shadcn/ui
3. Configure Tailwind CSS
4. Set up base routing (`/` and `/results/:runId`)
5. Create environment variable configuration (`.env` for API URL)

**Files to Create/Modify:**
- `src/App.tsx` - Root component with router
- `src/main.tsx` - Entry point
- `src/index.css` - Tailwind imports
- `.env.local` - API base URL
- `vite.config.ts` - Proxy configuration for local dev

**Acceptance Criteria:**
- ✅ Dev server runs on `http://localhost:5173`
- ✅ Router switches between landing and results pages
- ✅ Tailwind classes work
- ✅ TypeScript compiles with no errors

---

#### **Task 2: Landing Page - Idea Input** (4 hours)
**Objective:** Build idea submission form

**Subtasks:**
1. Create `LandingPage.tsx` component
2. Build idea input form with textarea (shadcn/ui)
3. Add validation (min 50 chars, max 1000 chars)
4. Implement submit button with loading state
5. Add error handling for API failures
6. Navigate to results page on success

**Components to Create:**
- `pages/LandingPage.tsx` - Main landing page
- `components/IdeaInput.tsx` - Textarea with character count
- `components/HeroSection.tsx` - Hero with input form

**API Integration:**
```typescript
// POST /api/runs
const response = await fetch(`${API_BASE_URL}/api/runs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idea_text: ideaText }),
});
const { run_id } = await response.json();
navigate(`/results/${run_id}`);
```

**Acceptance Criteria:**
- ✅ Textarea with character counter (50-1000 chars)
- ✅ Submit button disabled until valid
- ✅ Loading spinner during submission
- ✅ Error toast on API failure
- ✅ Navigates to results page on success

---

#### **Task 3: Results Page - Polling Logic** (3 hours)
**Objective:** Implement run status polling

**Subtasks:**
1. Create `ResultsPage.tsx` component
2. Extract `runId` from URL params
3. Implement polling with `setInterval` (5s intervals)
4. Handle status transitions: INIT → AGENTS_RUNNING → SYNTHESIZING → COMPLETED/VETOED
5. Stop polling on terminal status (COMPLETED/VETOED/FAILED)
6. Display error states

**Polling Logic:**
```typescript
useEffect(() => {
  const poll = async () => {
    const response = await fetch(`${API_BASE_URL}/api/runs/${runId}`);
    const run = await response.json();
    
    setRunData(run);
    
    if (['COMPLETED', 'VETOED', 'FAILED'].includes(run.status)) {
      clearInterval(intervalId);
    }
  };
  
  const intervalId = setInterval(poll, 5000);
  poll(); // Initial call
  
  return () => clearInterval(intervalId);
}, [runId]);
```

**Acceptance Criteria:**
- ✅ Polls every 5 seconds
- ✅ Stops on terminal status
- ✅ Shows loading state while polling
- ✅ Handles 404 (invalid runId)
- ✅ Handles network errors with retry

---

#### **Task 4: Results Page - Conversation Display** (6 hours)
**Objective:** Display agent conversation in chat interface

**Subtasks:**
1. Create `ConversationThread.tsx` component
2. Create `AgentMessage.tsx` component with:
   - Agent avatar (icon/color per agent)
   - Agent name
   - Conversational message
   - Structured output (collapsible)
   - Timestamp
3. Add auto-scroll to latest message
4. Style with chat bubble design
5. Add "thinking" animation for pending agents

**Components to Create:**
- `components/ConversationThread.tsx` - Full conversation
- `components/ChatMessage.tsx` - Single agent message
- `components/AgentAvatar.tsx` - Agent icon with color
- `components/StructuredOutput.tsx` - Collapsible JSON display

**Agent Styling:**
```typescript
const agentColors = {
  refiner: 'bg-blue-500',
  reality_checker: 'bg-purple-500',
  assassin: 'bg-red-500',
  cost: 'bg-yellow-500',
  synthesizer: 'bg-green-500',
};
```

**Acceptance Criteria:**
- ✅ Chat bubble layout (left-aligned)
- ✅ Agent avatars with distinct colors
- ✅ Conversational message displayed prominently
- ✅ Structured output hidden by default, expandable
- ✅ Auto-scroll to new messages
- ✅ Thinking animation for agents not yet run

---

#### **Task 5: Results Page - Final Recommendation** (4 hours)
**Objective:** Display synthesizer's final recommendation

**Subtasks:**
1. Create `FinalRecommendation.tsx` component
2. Display decision badge (STOP/CONTINUE/CONDITIONAL)
3. Show constrained MVP version
4. List open risks
5. Add action buttons ("Start Over", "Share Results")
6. Handle veto case (show veto reason prominently)

**Components to Create:**
- `components/DecisionSnapshot.tsx` - Final decision card
- `components/RankedRecommendations.tsx` - MVP version + risks
- `components/StatusBadge.tsx` - Colored badges for status

**Decision Styling:**
```typescript
const decisionColors = {
  STOP: 'bg-red-100 text-red-800',
  CONTINUE: 'bg-green-100 text-green-800',
  CONDITIONAL: 'bg-yellow-100 text-yellow-800',
};
```

**Acceptance Criteria:**
- ✅ Large decision badge at top
- ✅ MVP version displayed clearly
- ✅ Open risks listed as bullets
- ✅ "Start Over" button returns to landing page
- ✅ Veto case shows kill_reason prominently

---

#### **Task 6: Landing Page - Feature Showcase** (3 hours)
**Objective:** Explain the 5 agents to users

**Subtasks:**
1. Create `FeaturesSection.tsx` component
2. Create `FeatureCard.tsx` component (one per agent)
3. Add agent descriptions with icons
4. Create "How It Works" timeline
5. Add FAQ section (optional)

**Components to Create:**
- `components/FeaturesSection.tsx` - Grid of agent cards
- `components/FeatureCard.tsx` - Single agent description
- `components/ProcessTimeline.tsx` - Visual flow

**Content:**
```typescript
const agents = [
  {
    name: 'Refiner',
    icon: '🔍',
    description: 'Structures your idea and identifies core assumptions',
  },
  {
    name: 'Reality Checker',
    icon: '⚠️',
    description: 'Challenges assumptions and finds failure points',
  },
  // ... etc
];
```

**Acceptance Criteria:**
- ✅ 5 agent cards with icons and descriptions
- ✅ Visual timeline showing process flow
- ✅ Responsive grid layout
- ✅ Animations on scroll (optional)

---

#### **Task 7: UI Polish & Responsive Design** (4 hours)
**Objective:** Ensure mobile responsiveness and visual polish

**Subtasks:**
1. Test on mobile (320px, 375px, 768px, 1024px)
2. Fix layout issues on small screens
3. Add loading skeletons for polling states
4. Add micro-interactions (hover states, transitions)
5. Optimize font sizes and spacing
6. Add dark mode toggle (optional)

**Focus Areas:**
- Mobile: Stack conversation vertically, full-width cards
- Tablet: 2-column layout for features
- Desktop: 3-column layout, centered conversation (max 800px)

**Acceptance Criteria:**
- ✅ Works on mobile (375px width)
- ✅ No horizontal scroll on any screen size
- ✅ Touch targets ≥ 44px on mobile
- ✅ Loading states for all async operations
- ✅ Smooth transitions and animations

---

#### **Task 8: Error Handling & Edge Cases** (3 hours)
**Objective:** Handle all error scenarios gracefully

**Subtasks:**
1. Create `ErrorBoundary` component for React errors
2. Add 404 page for invalid routes
3. Handle invalid runId (non-existent run)
4. Handle network failures with retry button
5. Add timeout handling (run takes > 2 minutes)
6. Display FAILED status with error message

**Components to Create:**
- `components/ErrorBoundary.tsx` - React error boundary
- `pages/NotFound.tsx` - 404 page
- `components/ErrorAlert.tsx` - Error display

**Error Cases:**
- API unreachable → Show "Cannot connect to server" with retry
- Invalid runId → Show "Run not found" with back button
- Run FAILED → Show error_message from backend
- Timeout → Show "Taking longer than expected, check back later"

**Acceptance Criteria:**
- ✅ No uncaught errors crash the app
- ✅ All error states have clear messages
- ✅ Users can recover from errors (retry/back buttons)
- ✅ 404 page for invalid routes

---

#### **Task 9: Frontend Testing** (3 hours)
**Objective:** Validate frontend with real backend

**Subtasks:**
1. Start Azure Functions locally (`func start`)
2. Test full flow: Submit idea → Poll → Display conversation
3. Test veto scenario
4. Test error handling (disconnect backend mid-poll)
5. Test mobile responsiveness
6. Fix any bugs found

**Test Scenarios:**
1. **Happy Path:** Submit reasonable idea, see all 5 agents
2. **Veto Path:** Submit flawed idea, see veto at turn 3
3. **Error Path:** Kill backend during polling, see error handling
4. **Mobile Path:** Test on phone or device emulator

**Acceptance Criteria:**
- ✅ All test scenarios pass
- ✅ No console errors
- ✅ Smooth UX on mobile and desktop
- ✅ Polling stops correctly
- ✅ Navigation works correctly

---

### **Estimated Timeline**

| Task | Hours | Cumulative |
|------|-------|------------|
| 1. React Setup | 2 | 2 |
| 2. Landing Page | 4 | 6 |
| 3. Polling Logic | 3 | 9 |
| 4. Conversation Display | 6 | 15 |
| 5. Final Recommendation | 4 | 19 |
| 6. Feature Showcase | 3 | 22 |
| 7. UI Polish | 4 | 26 |
| 8. Error Handling | 3 | 29 |
| 9. Frontend Testing | 3 | 32 |

**Total:** 32 hours (4 days at 8 hours/day)

---

## 🚢 Week 4 Priorities - Deployment

### Goal: Deploy to Azure

**Estimated Duration:** 16 hours

### Deployment Tasks

#### **Task 1: Backend Deployment** (6 hours)
1. Create Azure Function App
2. Configure Application Settings (environment variables)
3. Deploy backend code
4. Test deployed endpoints
5. Configure custom domain (optional)

#### **Task 2: Frontend Deployment** (4 hours)
1. Build production bundle (`npm run build`)
2. Deploy to Azure Static Web Apps
3. Configure environment variables (API URL)
4. Test production site
5. Configure custom domain (optional)

#### **Task 3: CI/CD Pipeline** (6 hours)
1. Create GitHub Actions workflow
2. Auto-deploy backend on push to `main`
3. Auto-deploy frontend on push to `main`
4. Add build validation on PRs
5. Configure deployment slots (staging/production)

---

## 📝 Backend Improvements (Optional - Week 5)

### Priority Enhancements

1. **CORS Configuration** (30 min)
   - Add explicit CORS rules for frontend domain
   - Configure preflight handling

2. **Error Response Standardization** (1 hour)
   - Define error schema: `{ error: string, code: string, details?: any }`
   - Update all endpoints to use standard format

3. **Application Insights** (2 hours)
   - Add custom metrics (run duration, agent duration)
   - Add custom events (veto count, completion rate)
   - Configure alerts for high error rate

4. **Rate Limiting** (2 hours)
   - Add rate limiting per IP (100 requests/hour)
   - Return 429 with Retry-After header

5. **Preflight Expert Clarifier** (8 hours)
   - Implement LLM call to analyze idea
   - Generate clarification questions if details missing
   - Update schema to include `questions` array

---

## 🎯 Success Criteria - MVP Complete

### Backend ✅
- [x] 3 HTTP endpoints functional
- [x] 5 agents implemented
- [x] Orchestrator with veto logic
- [x] CosmosDB persistence
- [x] Integration tests passing
- [x] Local testing successful

### Frontend 🎯
- [ ] Landing page with idea input
- [ ] Results page with polling
- [ ] Conversation display (chat interface)
- [ ] Final recommendation display
- [ ] Error handling
- [ ] Mobile responsive
- [ ] Frontend testing complete

### Deployment 📦
- [ ] Backend deployed to Azure Functions
- [ ] Frontend deployed to Azure Static Web Apps
- [ ] CORS configured correctly
- [ ] End-to-end test on production
- [ ] CI/CD pipeline functional

---

## 🔄 Development Workflow

### For Week 3 (Frontend Development)

**Step 1: Local Backend Running**
```powershell
cd azure-backend
func start
# Backend running on http://localhost:7071
```

**Step 2: Local Frontend Running**
```powershell
cd ai-ideas-lab
npm run dev
# Frontend running on http://localhost:5173
```

**Step 3: Configure API URL**
```typescript
// .env.local
VITE_API_BASE_URL=http://localhost:7071
```

**Step 4: Test End-to-End**
1. Open http://localhost:5173
2. Submit an idea
3. See conversation on results page
4. Verify polling stops on completion

---

## 📚 Key Documentation

**Completed:**
- ✅ `architecture.md` - System architecture
- ✅ `PRD-EN.md` - Product requirements
- ✅ `WEEK2_PLAN.md` - Week 2 implementation plan
- ✅ `TESTING.md` - Integration test guide

**To Create in Week 3:**
- `FRONTEND_SETUP.md` - Frontend development guide
- `DEPLOYMENT.md` - Deployment instructions
- `API_REFERENCE.md` - API endpoint documentation

---

## 🎉 What We've Accomplished

**Week 1:** Infrastructure + HTTP Endpoints  
**Week 2:** Durable Functions + AI Agents + Orchestration  
**Week 3 (Planned):** Frontend Development  
**Week 4 (Planned):** Deployment + CI/CD

**Current Status:** Backend is production-ready, frontend is next!

---

**Next Action:** Start Week 3 Task 1 - React Project Setup

**Command to start:**
```powershell
cd ai-ideas-lab
npm install
npm run dev
```
