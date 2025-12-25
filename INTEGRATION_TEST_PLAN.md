# Backend-Frontend Integration Testing Plan

**Date:** December 24, 2025  
**Issue:** Response body stream error fixed  
**Status:** Testing in progress

---

## 🐛 Issue Identified & Fixed

### Error
```
Failed to execute 'text' on 'Response': body stream already read
```

### Root Cause
In `src/lib/api.ts`, the `fetchApi` function was trying to read the Response body twice:
1. First attempt: `response.json()` in error handler
2. Second attempt: `response.text()` as fallback
- **Problem:** Response body streams can only be read once

### Solution Applied
```typescript
// Clone response before reading
const responseClone = response.clone();

if (!response.ok) {
  try {
    errorData = await response.json();
  } catch {
    try {
      errorData = await responseClone.text(); // Use cloned response
    } catch {
      errorData = response.statusText;
    }
  }
}
```

**File Changed:** `ai-ideas-lab/src/lib/api.ts`

---

## 🧪 Integration Testing Plan

### Phase 1: Backend Endpoint Testing (Direct API)

#### Test 1.1: Preflight Endpoint
```powershell
# Terminal: Test preflight
$body = @{
    idea_text = "Build a mobile app for fitness tracking"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:7071/api/preflight" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "ready": true,
  "questions": []
}
```

**Validation:**
- [ ] Status: 200 OK
- [ ] Response has `ready` field (boolean)
- [ ] Response has `questions` field (array)

---

#### Test 1.2: Create Run Endpoint
```powershell
# Terminal: Test create run
$body = @{
    idea_text = "Build a mobile app for tracking fitness goals with AI-powered recommendations"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:7071/api/runs" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Save run_id for next test
$runId = $response.run_id
Write-Host "Run ID: $runId" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "run_id": "run_2025-12-24_xxxx",
  "status": "INIT",
  "orchestrator_instance_id": "abc123...",
  "created_at": "2025-12-24T20:00:00Z"
}
```

**Validation:**
- [ ] Status: 202 Accepted
- [ ] Response has `run_id` field
- [ ] Response has `status` field = "INIT"
- [ ] Response has `orchestrator_instance_id`
- [ ] Response has `created_at` timestamp

---

#### Test 1.3: Get Run Endpoint (Immediate)
```powershell
# Terminal: Test get run (immediately after creation)
$response = Invoke-RestMethod `
    -Uri "http://localhost:7071/api/runs/$runId" `
    -Method GET

$response | ConvertTo-Json -Depth 10
```

**Expected Response:**
```json
{
  "id": "run_2025-12-24_xxxx",
  "status": "INIT" or "AGENTS_RUNNING",
  "idea_text": "Build a mobile app...",
  "conversation": [],
  "created_at": "2025-12-24T20:00:00Z"
}
```

**Validation:**
- [ ] Status: 200 OK
- [ ] Response has `id` matching `run_id`
- [ ] Response has `status` (INIT or AGENTS_RUNNING)
- [ ] Response has `idea_text`
- [ ] Response has `conversation` array (may be empty)

---

#### Test 1.4: Poll Get Run (Wait for Completion)
```powershell
# Terminal: Poll until complete
$maxAttempts = 24  # 2 minutes (5s intervals)
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:7071/api/runs/$runId" `
        -Method GET
    
    Write-Host "[$attempt] Status: $($response.status) | Turns: $($response.conversation.Count)" -ForegroundColor Cyan
    
    if ($response.status -in @('COMPLETED', 'VETOED', 'FAILED')) {
        Write-Host "✓ Terminal state reached: $($response.status)" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        break
    }
    
    Start-Sleep -Seconds 5
    $attempt++
}
```

**Expected Terminal Response:**
```json
{
  "id": "run_2025-12-24_xxxx",
  "status": "COMPLETED",
  "idea_text": "...",
  "conversation": [
    {
      "turn_number": 1,
      "agent_id": "refiner",
      "agent_name": "Refiner",
      "message": "...",
      "structured_output": {...}
    },
    // ... 4 more turns
  ],
  "run_result": {
    "decision": "CONTINUE",
    "recommendation": "PROCEED",
    "constrained_version": "...",
    "open_risks": [...]
  },
  "created_at": "...",
  "completed_at": "..."
}
```

**Validation:**
- [ ] Status progresses: INIT → AGENTS_RUNNING → SYNTHESIZING → COMPLETED
- [ ] Conversation has 5 turns
- [ ] Each turn has: turn_number, agent_id, agent_name, message, structured_output
- [ ] run_result exists with decision, recommendation, constrained_version, open_risks
- [ ] completed_at timestamp exists

---

### Phase 2: Frontend API Client Testing

#### Test 2.1: Frontend Build (After Fix)
```powershell
# Terminal: Rebuild frontend with fix
cd c:\me\git\ai-round-table\ai-ideas-lab
npm run build
```

**Validation:**
- [ ] Build succeeds with no errors
- [ ] No TypeScript errors
- [ ] Output: "✓ built in X.XXs"

---

#### Test 2.2: Browser Console Test
Open browser console at http://localhost:8080 and run:

```javascript
// Test 1: Import API client
import { createRun, getRun } from '/src/lib/api.ts';

// Test 2: Create run
const response = await createRun({
  idea_text: "Build a mobile app for fitness tracking with AI recommendations"
});
console.log('Create Run Response:', response);

// Test 3: Get run
const runData = await getRun(response.run_id);
console.log('Get Run Response:', runData);
```

**Validation:**
- [ ] No console errors
- [ ] createRun returns run_id
- [ ] getRun returns run data

---

### Phase 3: Full UI Integration Testing

#### Test 3.1: Landing Page Flow
1. Open http://localhost:8080
2. Enter idea (50+ chars): "Build a mobile app for tracking fitness goals with AI-powered recommendations based on user progress, integrated with wearables, and gamification elements to boost engagement."
3. Click "Submit for Evaluation"

**Validation:**
- [ ] Character counter works (shows count)
- [ ] Submit button enabled when valid
- [ ] Loading state shows on submit
- [ ] Navigates to `/results/:runId`
- [ ] No console errors

---

#### Test 3.2: Results Page - Initial State
After navigation from landing page:

**Validation:**
- [ ] URL has runId parameter
- [ ] Shows "Loading evaluation..." spinner initially
- [ ] Header shows "Evaluation Results"
- [ ] Run ID displayed correctly
- [ ] No console errors

---

#### Test 3.3: Results Page - Polling
Watch the results page for 60 seconds:

**Validation:**
- [ ] Status badge updates (INIT → AGENTS_RUNNING → SYNTHESIZING → COMPLETED)
- [ ] Progress bar updates (0% → 100%)
- [ ] Agent message count shows (0 → 5 agents)
- [ ] Network tab shows GET requests every 5 seconds
- [ ] No console errors during polling

---

#### Test 3.4: Results Page - Conversation Display
After agents complete:

**Validation:**
- [ ] "Your Idea" card shows original text
- [ ] 5 agent messages appear in order:
  - [ ] 🔵 Refiner (turn 1)
  - [ ] 🟣 Reality Checker (turn 2)
  - [ ] 🔴 Assassin (turn 3)
  - [ ] 🟡 Cost Analyst (turn 4)
  - [ ] 🟢 Synthesizer (turn 5)
- [ ] Each message has colored left border
- [ ] Each message shows agent icon and name
- [ ] "Show Structured Analysis" button works (expand/collapse)
- [ ] Conversational message displays correctly
- [ ] No console errors

---

#### Test 3.5: Results Page - Final Recommendation
After COMPLETED status:

**Validation:**
- [ ] Large decision badge appears
- [ ] Decision color matches type (CONTINUE=green, STOP=red, CONDITIONAL=yellow)
- [ ] Decision icon appears (CheckCircle/XCircle/AlertTriangle)
- [ ] "Recommended MVP Approach" card shows
- [ ] "Open Risks & Considerations" card shows
- [ ] Risks display as bulleted list
- [ ] "Evaluate Another Idea" button works (navigates to home)
- [ ] No console errors

---

### Phase 4: Error Scenarios

#### Test 4.1: Network Error
1. Stop backend (Ctrl+C in backend terminal)
2. Try to submit new idea from landing page

**Validation:**
- [ ] Error alert appears
- [ ] Error message is clear
- [ ] No infinite loading state
- [ ] Can retry after restarting backend

---

#### Test 4.2: Invalid Run ID
1. Navigate to http://localhost:8080/results/invalid-id

**Validation:**
- [ ] Error alert appears
- [ ] "Back to Home" button works
- [ ] No infinite loading state

---

#### Test 4.3: Polling Timeout
Modify TIMEOUT_MS in ResultsPage.tsx temporarily to 10000 (10 seconds) for testing:

**Validation:**
- [ ] Timeout warning appears after 10 seconds
- [ ] Can continue waiting or refresh
- [ ] No crash or infinite loop

---

### Phase 5: Veto Scenario

#### Test 5.1: Assassin Veto Path
Submit this idea: "Create a time machine using quantum physics and temporal manipulation to allow users to travel back in time and change historical events."

**Validation:**
- [ ] Pipeline stops at turn 3 (Assassin)
- [ ] Status changes to VETOED
- [ ] Red "VETO" badge appears on Assassin message
- [ ] Large destructive alert appears with kill reason
- [ ] No turns 4-5 (Cost Analyst, Synthesizer)
- [ ] No final recommendation section
- [ ] "Evaluate Another Idea" button appears

---

### Phase 6: CORS & Network

#### Test 6.1: CORS Headers
Check browser Network tab for API requests:

**Validation:**
- [ ] No CORS errors in console
- [ ] Response headers include Access-Control-Allow-Origin
- [ ] Preflight requests (OPTIONS) succeed if present

---

#### Test 6.2: Response Format
Check Network tab → Response tab for each API call:

**Validation:**
- [ ] All responses are valid JSON
- [ ] Field names match TypeScript interfaces
- [ ] No unexpected fields
- [ ] Timestamps are ISO 8601 format

---

## 🔧 Debugging Tools

### Check Backend Logs
```powershell
# Backend terminal shows:
# - Function invocations
# - Agent calls
# - Orchestrator progress
# - Errors
```

### Check Frontend Console
```javascript
// Enable detailed logging
localStorage.setItem('debug', 'api:*');
```

### Network Tab Inspection
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Watch requests to localhost:7071

---

## ✅ Success Criteria

### Backend Endpoints
- [x] Preflight returns 200 with correct structure
- [x] Create-run returns 202 with run_id
- [x] Get-run returns 200 with run data
- [x] Polling shows status progression
- [x] Full pipeline completes in < 60 seconds

### Frontend Integration
- [ ] No "body stream already read" errors (FIXED)
- [ ] Build succeeds
- [ ] Landing page submits correctly
- [ ] Results page polls every 5 seconds
- [ ] Conversation displays all 5 agents
- [ ] Final recommendation shows correctly
- [ ] Error handling works

### User Experience
- [ ] No console errors
- [ ] Loading states clear
- [ ] Navigation works
- [ ] Responsive on desktop
- [ ] Veto scenario works
- [ ] Can evaluate multiple ideas

---

## 🚀 Next Steps After Testing

1. **Mobile Responsive** (Task 7) - Test on 375px width
2. **Error Boundary** (Task 8) - Add ErrorBoundary component
3. **Enhanced 404** (Task 8) - Improve not found page
4. **Documentation** - Update with any findings
5. **Week 4** - Deployment to Azure

---

**Current Status:** API client fix applied, ready for Phase 1 testing

**Run Test Commands:**
```powershell
# Test 1: Direct API test
cd azure-backend
.\test-quick.ps1

# Test 2: Frontend integration
# Open http://localhost:8080 in browser
# Submit idea and watch results
```
