# Frontend-Backend Integration Plan

**Date:** December 24, 2025  
**Status:** Integration blockers fixed, UI flow needs testing

---

## Current State Analysis

### ✅ What's Working (API Level)
- Backend endpoints responding correctly
- CosmosDB read/write operations functional
- CORS configured for local development
- Routes aligned (frontend calls `/api/runs`, backend serves `/api/runs`)

### ⚠️ What Needs Testing (UI Level)
- **Frontend components** calling backend through actual UI
- **User journey** from idea submission to results display
- **Polling mechanism** for run status updates
- **Error handling** in the UI layer
- **Data flow** through React components and state management

---

## Integration Flow Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. LANDING PAGE (LandingPage.tsx)
   ┌──────────────────────────┐
   │ User enters idea text    │
   │ (min 50, max 1000 chars) │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ Click "Evaluate My Idea" │
   └────────────┬─────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Frontend calls:                    │
   │ createRun({ idea_text: "..." })    │
   │                                    │
   │ → POST /api/runs                   │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Backend response:                  │
   │ {                                  │
   │   run_id: "run_2025-12-24_xxxx",  │
   │   status: "INIT",                  │
   │   created_at: "..."                │
   │ }                                  │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Navigate to:                       │
   │ /results/{run_id}                  │
   └─────────────────────────────────────┘

2. RESULTS PAGE (ResultsPage.tsx)
   ┌──────────────────────────────────────┐
   │ Component mounts with run_id param   │
   └────────────┬─────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Start polling (every 5 seconds):   │
   │                                    │
   │ getRun(run_id)                     │
   │ → GET /api/runs/{id}               │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Backend returns run document:      │
   │ {                                  │
   │   id: "...",                       │
   │   status: "INIT|AGENTS_RUNNING|    │
   │            SYNTHESIZING|COMPLETED",│
   │   conversation: [...],             │
   │   run_result: {...}                │
   │ }                                  │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ UI updates based on status:        │
   │                                    │
   │ - INIT: Show "Initializing..."     │
   │ - AGENTS_RUNNING: Show turns       │
   │ - COMPLETED: Show final result     │
   │ - VETOED/FAILED: Show error        │
   └─────────────────────────────────────┘
```

---

## Integration Testing Checklist

### Phase 1: Submit Idea Flow ⏳
**Goal:** Verify user can submit idea and reach results page

**Test Steps:**
1. [ ] Open http://localhost:8080/
2. [ ] Enter idea text (50+ characters)
3. [ ] Click "Evaluate My Idea" button
4. [ ] **Verify:**
   - [ ] Button shows loading state
   - [ ] No error messages appear
   - [ ] Browser navigates to `/results/{run_id}`
   - [ ] Network tab shows `POST /api/runs` with 202 status
   - [ ] run_id is captured in URL

**Expected Behavior:**
- Frontend sends idea_text to backend
- Backend creates run in CosmosDB
- Returns run_id
- Frontend navigates to results page

**Current Issue:** ❓ Need to test in browser

---

### Phase 2: Results Page Polling ⏳
**Goal:** Verify results page polls backend and displays status

**Test Steps:**
1. [ ] After submitting idea, observe results page
2. [ ] **Verify:**
   - [ ] Network tab shows repeated `GET /api/runs/{id}` every 5 seconds
   - [ ] Status badge shows "INIT" initially
   - [ ] Progress bar appears
   - [ ] Page doesn't crash or show errors

**Expected Behavior:**
- ResultsPage component calls `getRun(runId)` on mount
- Sets up polling interval (5000ms)
- Updates state when response arrives
- Displays status and progress

**Current Issue:** ❓ Need to test polling behavior

---

### Phase 3: Agent Conversation Display ⏳
**Goal:** Verify conversation turns appear (when agents run)

**Test Steps:**
1. [ ] Watch results page while run is processing
2. [ ] **Verify:**
   - [ ] Agent messages appear as they complete
   - [ ] Agent icons and names show correctly
   - [ ] Message content is readable
   - [ ] Structured output (if any) displays properly

**Expected Behavior:**
- When `conversation` array updates, UI renders new turns
- Each turn shows agent identity, message, timestamp

**Current Issue:** ⚠️ Agents won't run yet (orchestrator disabled)

---

### Phase 4: Final Recommendation ⏳
**Goal:** Verify final decision displays correctly

**Test Steps:**
1. [ ] When status becomes "COMPLETED"
2. [ ] **Verify:**
   - [ ] Final recommendation card appears
   - [ ] Decision (STOP/CONTINUE/CONDITIONAL) is shown
   - [ ] Recommendation text is readable
   - [ ] Open risks list displays

**Expected Behavior:**
- `run_result` object displays in dedicated section
- Decision badge shows correct color
- All fields render properly

**Current Issue:** ⚠️ No runs will complete yet (orchestrator disabled)

---

### Phase 5: Error Handling ⏳
**Goal:** Verify error states display correctly

**Test Scenarios:**

**A. Backend Unreachable**
1. [ ] Stop backend (terminate npm start)
2. [ ] Try to submit idea from frontend
3. [ ] **Verify:**
   - [ ] Error message appears
   - [ ] User stays on landing page
   - [ ] Can retry after backend restarts

**B. Invalid Idea Text**
1. [ ] Enter < 50 characters
2. [ ] Try to submit
3. [ ] **Verify:**
   - [ ] Button is disabled
   - [ ] Character count shows requirement

**C. Run Not Found**
1. [ ] Navigate to `/results/invalid-run-id`
2. [ ] **Verify:**
   - [ ] Error message displays
   - [ ] Option to go back to home

**D. Timeout**
1. [ ] Let results page poll for 2+ minutes (TIMEOUT_MS = 120000)
2. [ ] **Verify:**
   - [ ] Timeout message appears
   - [ ] Polling stops
   - [ ] Option to retry or go home

---

## Known Gaps & Workarounds

### Gap 1: Agent Pipeline Not Running ⚠️
**Issue:** Orchestrator is disabled in backend  
**Impact:** Runs stay in "INIT" status forever  
**Workaround:** Test UI flow with mock data or enable orchestrator

**Files affected:**
- `azure-backend/src/functions/create-run.ts` (lines 60-65 commented out)

**To enable agents:**
```typescript
// Uncomment in create-run.ts
const client = df.getClient(context);
const instanceId = await client.startNew('AgentPipeline', {
  input: { runId: run_id, ideaText: idea_text },
});
```

### Gap 2: ChatPage vs ResultsPage Confusion
**Issue:** Two different result display components exist  
**Impact:** Unclear which one to use  
**Resolution needed:** Decide on single results flow

**Files:**
- `ChatPage.tsx` - Uses mock API, local simulation
- `ResultsPage.tsx` - Uses real API, polling mechanism

**Recommendation:** Use `ResultsPage.tsx` for production flow

---

## Manual Testing Script

### Test 1: Happy Path (Without Agents)
```bash
# 1. Ensure both services running
# Backend: npm start in azure-backend/
# Frontend: npm run dev in ai-ideas-lab/

# 2. Open browser to http://localhost:8080

# 3. Actions:
- Enter idea: "Build a mobile app for tracking fitness goals"
- Click "Evaluate My Idea"
- Observe navigation to /results/{run_id}
- Watch network tab for polling requests
- Verify status shows "INIT"

# Expected Result:
✓ No errors in console
✓ Polling occurs every 5 seconds
✓ UI shows "Initializing..." state
✓ Can navigate back to home
```

### Test 2: Error Handling
```bash
# 1. Stop backend (Ctrl+C in backend terminal)

# 2. Try to submit idea from frontend

# Expected Result:
✓ Error message: "Failed to submit idea"
✓ User stays on landing page
✓ Button becomes clickable again

# 3. Restart backend

# 4. Retry submission

# Expected Result:
✓ Submission works
✓ Navigates to results page
```

### Test 3: Invalid Input
```bash
# 1. Enter only 10 characters in idea field

# Expected Result:
✓ Character count shows "10 / 1000 (minimum 50)"
✓ Button is disabled
✓ Cannot submit

# 2. Paste 1500 characters

# Expected Result:
✓ Character count turns red
✓ Shows "1500 / 1000"
✓ Button is disabled
```

---

## Integration Action Plan

### Immediate Actions (Next 15 min)
1. ✅ **Document current state** (this file)
2. ⏳ **Open browser to http://localhost:8080**
3. ⏳ **Test submit idea flow manually**
4. ⏳ **Verify polling happens in network tab**
5. ⏳ **Check console for any errors**

### Short-term (Next hour)
6. ⏳ **Test all error scenarios**
7. ⏳ **Verify CORS works from browser**
8. ⏳ **Test navigation flows**
9. ⏳ **Screenshot working flow**
10. ⏳ **Document any bugs found**

### Medium-term (Later)
11. ⏳ **Enable agent orchestrator**
12. ⏳ **Test full run with all 5 agents**
13. ⏳ **Verify conversation turns appear**
14. ⏳ **Test final recommendation display**
15. ⏳ **Performance test (multiple runs)**

---

## Success Criteria

### Minimum Viable Integration ✅
- [x] Backend compiles and runs
- [x] Frontend compiles and runs
- [x] Routes match between frontend and backend
- [ ] User can submit idea via UI
- [ ] Frontend successfully calls backend
- [ ] Results page polls backend
- [ ] No console errors on happy path
- [ ] Error messages display for failures

### Full Integration (Future)
- [ ] Agents run and return results
- [ ] Conversation turns appear in real-time
- [ ] Final recommendation displays
- [ ] Veto scenarios work correctly
- [ ] All 5 agents process successfully
- [ ] Performance is acceptable (<3s per agent)
- [ ] UI feels responsive during polling

---

## Next Step

**YOU NEED TO:**
1. Open http://localhost:8080/ in your browser
2. Submit a test idea through the UI
3. Report back what happens:
   - Did it navigate to results page?
   - Any errors in console (F12)?
   - Does polling show in network tab?
   - What does the UI display?

Then I'll know exactly where the integration stands and what needs fixing.
