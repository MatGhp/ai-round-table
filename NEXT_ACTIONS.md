# Next Actions Plan

**Date:** December 25, 2025  
**Status:** Critical bug fixed, ready for refinement and deployment

---

## 1. Review & Adjust Assassin Agent 🎯

### Current Issue
The Assassin agent is **too aggressive** with vetoes:
- ✗ Vetoed: "Build a simple task management app for teams" (unjustified_complexity)
- ✓ Passed: "Create an online platform that connects local farmers..." 

**Problem:** The agent interprets "simple" ideas as lacking novelty and vetoes them for `simpler_solution_exists` or `unjustified_complexity` even when they might have valid use cases.

### Root Cause Analysis

**Current prompt states:**
> "Issue a veto (veto: true) ONLY if there is no real user need (no_real_user), a much simpler solution exists (simpler_solution_exists), complexity is unjustified for the value (unjustified_complexity)..."

**Why it's too harsh:**
1. No threshold for "simpler solution exists" - Excel/Trello exist for task management, but doesn't mean all task apps should be vetoed
2. "Unjustified complexity" is subjective - needs context about target users
3. No consideration for differentiation or niche focus
4. Doesn't distinguish between "has competitors" vs "fundamentally flawed"

---

### Recommended Changes

#### Option A: Soften the Criteria (Recommended)
Make veto criteria more specific and raise the bar:

**New veto conditions:**
- ✓ Keep: No real user need at all
- ✗ Remove: "Simpler solution exists" (too broad)
- ✓ Keep but clarify: "Unjustified complexity" → Only if complexity vastly exceeds value AND no differentiation
- ✓ Add: Market is completely saturated AND no differentiation proposed
- ✓ Add: Solution is technically impossible with current technology
- ✓ Keep: Economics fundamentally broken (e.g., costs exceed revenue by 10x+)

**Rationale:** The Assassin should kill *fatally flawed* ideas, not ideas with competition. Let the Cost Analyst and Synthesizer handle "hard but possible" scenarios.

#### Option B: Add Veto Threshold
Require TWO fatal flaws before vetoing (e.g., unsound assumptions AND economic nonviability)

**Rationale:** More cautious, prevents single-criteria vetoes

#### Option C: Make Veto Conditional
Assassin recommends veto but Synthesizer makes final call

**Rationale:** Adds a safety layer, but complicates the pipeline

---

### Implementation Plan

**Step 1: Update the Prompt (15 min)**

File: [azure-backend/src/prompts/agents.ts](azure-backend/src/prompts/agents.ts) line 90-130

**Before:**
```typescript
Issue a veto (veto: true) ONLY if:
- There is no real user need (no_real_user)
- A much simpler solution exists (simpler_solution_exists)
- Complexity is unjustified for the value (unjustified_complexity)
- Core assumptions are unsound (unsound_assumptions)
- Economics don't work (economic_nonviability)
```

**After (Option A):**
```typescript
Issue a veto (veto: true) ONLY if you identify a FATAL flaw that makes the idea fundamentally unviable:

- **No real user need** (no_real_user): There is zero evidence of an actual problem or the problem is trivial
  - Example: "Build an app to remind people to blink"
  
- **Technically impossible** (technical_impossibility): The solution requires technology that doesn't exist or violates physics
  - Example: "Build an app that reads minds without hardware"
  
- **Core assumptions are provably false** (unsound_assumptions): Key assumptions are demonstrably wrong, not just risky
  - Example: "Users will pay $1000/month for a to-do list"
  
- **Economics are fundamentally broken** (economic_nonviability): Costs exceed revenue by 10x+ with no path to profitability
  - Example: "Free service that requires $100 compute per user per day"

**DO NOT veto just because:**
- Competitors exist (that's normal - focus on differentiation)
- The idea is "simple" (simple can be valuable)
- Implementation is hard (hard ≠ impossible)
- You personally wouldn't use it (you're not the target user)

Be VERY conservative with vetoes. If there's ANY path to viability, let the Cost Analyst and Synthesizer address concerns.
Your veto ends the evaluation immediately - use it only for truly doomed ideas.
```

**Step 2: Test the Changes (10 min)**

Run these test ideas after updating:

```powershell
# Should NOT veto anymore (has competitors but valid use case)
"Build a simple task management app for teams"

# Should NOT veto (simple but solves real problem)
"Create a Chrome extension that blocks distracting websites during work hours"

# SHOULD veto (no real need)
"Build an app that reminds people to blink every 5 seconds"

# SHOULD veto (economics broken)
"Free app that provides unlimited AI video generation with no ads or premium tier"
```

**Step 3: Monitor & Iterate (ongoing)**

After deployment:
- Track veto rate (target: 5-15% of ideas)
- If veto rate > 20%: Make criteria stricter
- If veto rate < 5%: Review quality of non-vetoed ideas

---

### Alternative: Add Veto Confidence Score

Instead of binary veto, add confidence:

```json
{
  "veto": true,
  "confidence": 0.95,  // 0.0 - 1.0
  "kill_reason": "...",
  "failure_mode": "..."
}
```

Only enforce veto if `confidence >= 0.85`. This adds nuance without changing the pipeline.

---

## 2. Deploy to Azure 🚀

### Pre-Deployment Checklist

#### Security ✅ (Already Done)
- [x] `local.settings.json` in `.gitignore`
- [ ] Move secrets to Azure Key Vault (do this before public deployment)
- [ ] Enable Managed Identity for Function App
- [ ] Remove hardcoded connection strings from code

#### Configuration 📋
- [ ] Create production `local.settings.json.production` template
- [ ] Document required environment variables
- [ ] Set up custom domain (optional)

#### Testing 🧪
- [ ] Verify all endpoints work locally one more time
- [ ] Test with edge cases (very long ideas, special characters, etc.)
- [ ] Check error handling (kill backend mid-run, etc.)

---

### Deployment Strategy: GitHub Actions

**Philosophy:** Simple, direct deployment on push to main. No staging environments.

#### Step 1: Create Azure Resources (One-Time)

If not already created, provision:

```powershell
# Run existing setup script
cd c:\me\git\ai-round-table\azure-backend\scripts
.\setup-azure.ps1

# Note the output values:
# - Function App name
# - Static Web App name (for frontend)
# - Resource group name
```

#### Step 2: Set Up GitHub Secrets (One-Time)

In GitHub repository settings → Secrets and variables → Actions:

**Required Secrets:**
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - Download from Azure Portal
- `AZURE_STATICWEBAPP_TOKEN` - Generated when creating Static Web App
- `COSMOS_CONNECTION_STRING` - From Azure Portal
- `AZURE_OPENAI_ENDPOINT` - From Azure Portal
- `AZURE_OPENAI_KEY` - From Azure Portal
- `APPINSIGHTS_INSTRUMENTATIONKEY` - From Azure Portal

**How to get publish profile:**
1. Go to Azure Portal → Function App → Get publish profile
2. Copy XML content
3. Paste into GitHub secret

#### Step 3: Create GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy-backend:
    name: Deploy Backend to Azure Functions
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd azure-backend
          npm ci
      
      - name: Build backend
        run: |
          cd azure-backend
          npm run build
      
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: 'func-ai-roundtable'  # Replace with your Function App name
          package: './azure-backend'
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
      
      - name: Smoke test backend
        run: |
          sleep 30  # Wait for deployment
          curl -f https://func-ai-roundtable.azurewebsites.net/api/preflight \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"idea_text":"Deployment test idea"}' || exit 1
  
  deploy-frontend:
    name: Deploy Frontend to Static Web App
    runs-on: ubuntu-latest
    needs: deploy-backend  # Deploy backend first
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd ai-ideas-lab
          npm ci
      
      - name: Build frontend
        run: |
          cd ai-ideas-lab
          npm run build
        env:
          VITE_API_BASE_URL: https://func-ai-roundtable.azurewebsites.net
      
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATICWEBAPP_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: '/ai-ideas-lab'
          output_location: 'dist'
      
      - name: Smoke test frontend
        run: |
          sleep 30  # Wait for deployment
          curl -f https://ai-roundtable.azurestaticapps.net || exit 1

  notify:
    name: Notify Deployment Status
    runs-on: ubuntu-latest
    needs: [deploy-backend, deploy-frontend]
    if: always()
    
    steps:
      - name: Check deployment status
        run: |
          if [ "${{ needs.deploy-backend.result }}" = "success" ] && [ "${{ needs.deploy-frontend.result }}" = "success" ]; then
            echo "✅ Deployment successful!"
          else
            echo "❌ Deployment failed!"
            exit 1
          fi
```

#### Step 4: Update Frontend Environment Config

File: `ai-ideas-lab/.env.production`

```env
VITE_API_BASE_URL=https://func-ai-roundtable.azurewebsites.net
```

Ensure `.env.local` is in `.gitignore` (already done).

#### Step 5: Deploy!

```bash
# Commit the workflow file
git add .github/workflows/deploy.yml
git add ai-ideas-lab/.env.production
git commit -m "feat: add GitHub Actions deployment pipeline"
git push origin main

# Watch the deployment in GitHub Actions tab
```

---

### Post-Deployment Verification

**1. Test All Endpoints:**
```powershell
$baseUrl = "https://func-ai-roundtable.azurewebsites.net"

# Test preflight
Invoke-RestMethod -Uri "$baseUrl/api/preflight" -Method POST -Body '{"idea_text":"test"}' -ContentType "application/json"

# Test create run
$run = Invoke-RestMethod -Uri "$baseUrl/api/runs" -Method POST -Body '{"idea_text":"Build a fitness tracking app"}' -ContentType "application/json"

# Test get run
Start-Sleep -Seconds 15
Invoke-RestMethod -Uri "$baseUrl/api/runs/$($run.run_id)"
```

**2. Check Application Insights:**
- Go to Azure Portal → Function App → Application Insights
- Review Live Metrics for real-time traffic
- Check for any errors in Logs

**3. Test Frontend:**
- Open https://ai-roundtable.azurestaticapps.net
- Submit a test idea
- Verify polling works
- Check result display

---

### Rollback Plan

If deployment fails:

**Option 1: Revert Git Commit**
```bash
git revert HEAD
git push origin main
# GitHub Actions will auto-deploy previous version
```

**Option 2: Manual Rollback in Azure**
- Azure Portal → Function App → Deployment Center → Deployment History
- Select previous deployment → Redeploy

**Option 3: Local Deployment**
```bash
cd azure-backend
func azure functionapp publish func-ai-roundtable
```

---

### Monitoring Setup (Post-Deployment)

**1. Application Insights Queries:**

Save these queries in Application Insights:

```kusto
// Failed runs
traces
| where message contains "Pipeline failed"
| order by timestamp desc

// Veto rate
customMetrics
| where name == "veto"
| summarize VetoRate = avg(value) by bin(timestamp, 1h)

// Avg completion time
requests
| where name contains "runs"
| summarize AvgDuration = avg(duration) by bin(timestamp, 1h)
```

**2. Set Up Alerts:**

- Error rate > 5% in 5 minutes → Email alert
- Avg response time > 30 seconds → Email alert
- Veto rate > 50% → Warning (might indicate Assassin is too harsh)

---

## 3. Quick Wins (Optional)

After deployment, these can be done incrementally:

### A. Add Orchestrator Timeout
File: `azure-backend/src/orchestrators/agent-pipeline.ts`

```typescript
const timeoutTask = context.df.createTimer(
  new Date(Date.now() + 90000)  // 90 seconds
);

const result = yield context.df.Task.any([
  agentPipelineTask,
  timeoutTask
]);

if (result === timeoutTask) {
  // Timeout occurred
  yield context.df.callActivity('UpdateRunStatus', {
    runId,
    status: 'FAILED',
    errorMessage: 'Pipeline timeout after 90 seconds'
  });
}
```

### B. Better Error Messages in Frontend
File: `ai-ideas-lab/src/lib/api.ts`

```typescript
catch (error) {
  if (error.status === 429) {
    throw new ApiError('Service is busy. Please try again in a moment.', 429);
  } else if (error.status >= 500) {
    throw new ApiError('Service temporarily unavailable. Please try again.', error.status);
  } else {
    throw new ApiError(error.message || 'An error occurred', error.status);
  }
}
```

### C. Add Correlation IDs
All log statements should include a correlation ID:

```typescript
context.log(`[${runId}] Agent pipeline starting...`);
```

This makes debugging much easier in Application Insights.

---

## Summary

### Today (1-2 hours):
1. ✅ Update Assassin prompt with refined veto criteria
2. ✅ Test with sample ideas to verify behavior
3. ✅ Commit changes

### This Week (2-3 hours):
1. ✅ Set up GitHub Secrets
2. ✅ Create GitHub Actions workflow
3. ✅ Deploy to production
4. ✅ Verify all functionality
5. ✅ Set up basic monitoring

### Next Week (ongoing):
1. Monitor veto rate and adjust if needed
2. Review Application Insights for errors
3. Gather user feedback
4. Iterate on agent prompts based on real usage

**Estimated time to production:** 3-5 hours total work

---

## Commands to Run

```powershell
# 1. Update Assassin prompt
code azure-backend/src/prompts/agents.ts

# 2. Test locally
cd azure-backend
npm run build
npm start

# 3. Test Assassin behavior
# (run the test commands from earlier)

# 4. Commit changes
git add .
git commit -m "refine: adjust Assassin veto criteria to be less aggressive"
git push origin main

# 5. Set up deployment (one-time)
# Follow "Step 2: Set Up GitHub Secrets" above

# 6. Create workflow file
mkdir .github/workflows -Force
code .github/workflows/deploy.yml

# 7. Deploy
git add .github/workflows/deploy.yml
git commit -m "feat: add deployment pipeline"
git push origin main

# Watch deployment in GitHub Actions!
```
