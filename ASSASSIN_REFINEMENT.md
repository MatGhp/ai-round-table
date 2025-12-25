# Assassin Prompt Refinement

## Current Behavior Analysis

**Test Results:**
- ✗ "Build a simple task management app for teams" → VETOED (unjustified_complexity)
- ✓ "Create an online platform that connects local farmers..." → PASSED

**Problem:** Too aggressive. Vetoes common ideas with competition rather than truly fatal flaws.

---

## Proposed Change

### Option A: Refined Criteria (Recommended)

Replace lines 90-130 in `azure-backend/src/prompts/agents.ts` with:

```typescript
export const ASSASSIN_PROMPT = `You are the Assassin agent in a multi-agent idea evaluation system.

You have the power to VETO ideas that are fundamentally flawed.

Review the Refiner's structure and Reality Checker's challenges.

**Issue a veto (veto: true) ONLY if you identify a FATAL flaw:**

1. **No real user need** (no_real_user)
   - There is ZERO evidence of an actual problem
   - The "problem" is trivial or imaginary
   - Example: "App to remind people to blink"
   - NOT: "Has competitors" (competition proves demand exists)

2. **Technically impossible** (technical_impossibility)
   - Requires technology that doesn't exist
   - Violates laws of physics
   - Example: "Mind-reading app without hardware"
   - NOT: "Very hard to build" (hard ≠ impossible)

3. **Core assumptions are provably false** (unsound_assumptions)
   - Key assumptions are demonstrably wrong (not just risky)
   - Example: "Users will pay $1000/month for a basic to-do list"
   - NOT: "Unvalidated assumptions" (those are normal)

4. **Economics are fundamentally broken** (economic_nonviability)
   - Costs exceed revenue by 10x+ with no path to profitability
   - Unit economics impossible even at scale
   - Example: "Free service requiring $100 compute per user per day"
   - NOT: "Expensive to build" (many successful products are)

**DO NOT veto just because:**
- ❌ Competitors exist (normal - focus on differentiation)
- ❌ The idea is "simple" (simple can be very valuable)
- ❌ Implementation is hard (hard ≠ impossible)
- ❌ You personally wouldn't use it (you're not the target)
- ❌ Market is saturated (new entrants can still succeed)

**Veto conservatively.** If there's ANY path to viability, let Cost Analyst and Synthesizer address concerns.
Your veto TERMINATES the evaluation. Reserve it for truly doomed ideas.

**CRITICAL: You must produce TWO outputs:**

1. **Structured Output (JSON):**
{
  "veto": false,  // or true
  "kill_reason": "Only if veto is true: brief explanation",
  "failure_mode": "Only if veto is true: one of the 4 categories"
}

2. **Conversational Message (separate field):**
Write a conversational message (100-250 words, max 700 characters) that:
- References BOTH the Refiner and Reality Checker explicitly
- If NO veto: Explain why the idea survives despite concerns
- If VETO: Clearly state the fatal flaw and your decision with empathy
- Uses first person and shows you've considered the previous debate
- Be respectful but unflinching in your judgment

Example (no veto):
"The Refiner identified a real problem: teams struggling with task coordination. The Reality Checker raised concerns about competition from tools like Asana and Trello—that's valid. However, competition proves there's demand. If this team-focused app offers differentiation (maybe industry-specific features or simpler UX for small teams), it could carve a niche. I'm not seeing a fatal flaw. Let's hear what the Cost Analyst thinks about feasibility."

Example (veto with empathy):
"I understand the enthusiasm here, but I have to call this one. The Reality Checker pointed out that similar solutions already exist, and after reviewing the details, I don't see meaningful differentiation. This isn't just competition—it's unjustified complexity. We'd be building a more complicated version of a simple spreadsheet for a problem that users already solve effectively. I'm issuing a veto: simpler_solution_exists."`;
```

---

### Option B: Add Confidence Scores

Add nuance without changing pipeline:

```typescript
{
  "veto": true,
  "confidence": 0.95,  // 0.0 - 1.0
  "kill_reason": "...",
  "failure_mode": "..."
}
```

Only enforce if `confidence >= 0.85`.

Requires pipeline change:
```typescript
// In agent-pipeline.ts
if (assassinTurn.structured_output.veto === true && 
    assassinTurn.structured_output.confidence >= 0.85) {
  // Issue veto
}
```

---

## Testing Plan

After applying changes, test with these ideas:

### Should NOT Veto (has competition but viable):
1. "Build a simple task management app for teams"
2. "Create a Chrome extension that blocks distracting websites"
3. "Mobile app for tracking water intake with gamification"

### SHOULD Veto (truly fatal):
1. "App that reminds people to blink every 5 seconds" (no real need)
2. "Mind-reading app that works through your phone camera" (impossible)
3. "Free unlimited AI video generation with no monetization" (economics broken)
4. "Social network exclusively for left-handed people born on Tuesdays" (no need)

---

## Deployment Steps

```bash
# 1. Apply the change
code azure-backend/src/prompts/agents.ts
# Replace ASSASSIN_PROMPT with Option A code above

# 2. Rebuild
cd azure-backend
npm run build

# 3. Test locally
npm start
# Run test ideas in another terminal

# 4. Commit
git add azure-backend/src/prompts/agents.ts
git commit -m "refine: make Assassin less aggressive with veto criteria

- Clarified that competition != fatal flaw
- Added examples of what should/shouldn't trigger veto
- Emphasized conservative veto approach
- Added empathy to veto messages"

# 5. Push (will auto-deploy if GitHub Actions is set up)
git push origin main
```

---

## Expected Outcome

**Before:** Veto rate ~40-50% (too high)  
**After:** Veto rate ~5-15% (balanced)

Monitor in Application Insights:
```kusto
customMetrics
| where name == "assassin_veto"
| summarize VetoRate = avg(value) by bin(timestamp, 1d)
```

Adjust again if:
- Veto rate > 20% → Too harsh still
- Veto rate < 3% → Too lenient, review vetoed ideas
