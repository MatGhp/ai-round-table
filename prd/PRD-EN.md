# PRD – Product Requirements Document

**Product:** AI Round Table
**Version:** 1.0 (MVP / PoC)
**Status:** Draft – Ready for Implementation

---

## 1. Executive Summary

**AI Round Table** is a Multi-Agent AI System for analyzing, critiquing, validating, and making decisions about ideas.

This product helps users examine their ideas from multiple, adversarial, and structured perspectives before investing time and money.

### Product Focus:

- Informed decision-making
- Rapid elimination of weak ideas
- Reducing the illusion of progress caused by beautiful but incorrect LLM outputs

AI Round Table differs from traditional AI tools by enforcing structured disagreement, explicit veto mechanisms, and termination conditions instead of optimizing for ideation or content generation.

---

## 2. Problem Statement

Users face the following problems when using a single LLM to analyze ideas:

- Unintentional confirmation of initial assumptions (Confirmation Bias)
- Absence of real opposition
- Coherent but unrealistic outputs
- Endless idea growth without validation

No general-purpose tool exists that:

- Applies contradictory roles in a structured manner
- Allows veto and idea termination
- Enforces critical thinking, not just recommendations

As a result, users often mistake linguistic coherence for validated reasoning.

---

## 3. Product Goals

### Primary Goals

- Create controlled intellectual conflict
- Extract and validate assumptions
- Enable saying "no" to ideas
- Support continue/stop decisions

### Out of Scope

- Creative ideation
- Content generation
- Replacing human brainstorming
- Free chat or purely performative role-playing

---

## 4. Target Users

### Primary Users

- Product Managers
- Tech Leads / Architects
- Startup Founders
- Freelancers & Consultants

### Secondary Users

- Engineering Managers
- Innovation Teams
- AI Power Users

---

## 5. User Flow

1. User inputs idea briefly (5–10 lines)
2. **Optional:** System runs an **Expert Clarifier (Preflight)** to ask questions if critical details are missing
3. User answers clarification questions (if any)
4. System starts a **Sequential Conversational Round Table**:
   - Agent 1 (Refiner) analyzes the idea first
   - Agent 2 (Reality Checker) reads Agent 1's analysis and responds
   - Agent 3 (Assassin) reads the conversation so far and may veto
   - Agent 4 (Cost) reads all previous responses and analyzes tradeoffs
   - Agent 5 (Synthesizer) reads the entire conversation and creates final recommendation
5. User sees the conversation thread in real-time (chat-like interface)
6. Final output includes:
   - Full conversation transcript
   - Ranked recommendations with justification
   - Decision (Continue / Stop / Conditional)

---

## 6. Agent Conversational Architecture

### Agent 0 – Expert Clarifier (Preflight)

**Goal:** Ask only the minimum questions required to remove ambiguity before the round table starts.

**Input:** User's original idea
**Output:**
- `ready` (boolean)
- `questions[]` (0..N)

**Rules:**
- Must not propose solutions or improve the idea.
- Must not expand the scope.
- Questions should be short, specific, and limited (e.g., max 10–12).

---

### Agent 1 – Idea Refiner (First Speaker)

**Goal:** Clarify the idea without expansion

**Input:** 
- Original user idea
- Clarifications (if any)

**Output:**
- Problem Statement
- Assumptions identified
- Proposed Solution summary
- **Conversational message** (natural language response to the user)

**Conversational Rules:**
- Speak directly: "I see three core assumptions here..."
- Be concise (max 200 words)
- Set context for the next agents

### Agent 2 – Reality Checker (Second Speaker)

**Goal:** Expose hidden assumptions and challenge the Refiner's analysis

**Input:**
- Original user idea
- Agent 1 (Refiner) full response

**Output:**
- List of assumptions (including those Refiner missed)
- Testable claims
- Potential failure points
- **Conversational message** (response to Refiner + user)

**Conversational Rules:**
- Reference Refiner explicitly: "Refiner identified X, but I also see Y..."
- Challenge or agree with specific points
- Be concise (max 200 words)
- Raise red flags early

### Agent 3 – Assassin (Third Speaker, Veto Authority)

**Goal:** Actively attempt to kill the idea based on the conversation so far
**Authority:** Full veto power

**Input:**
- Original user idea
- Agent 1 (Refiner) full response
- Agent 2 (Reality Checker) full response

**Output:**
- Veto decision (boolean)
- Kill reason (if veto = true)
- Failure mode category
- **Conversational message** (response to the discussion)

**Conversational Rules:**
- Reference previous agents: "Refiner claims X, but Reality Checker exposed Y, which proves..."
- Must justify veto by citing specific points from the conversation
- If veto issued, round table stops immediately
- Be direct and decisive (max 150 words)

**Focus:**
- Absence of real need
- Simpler existing solutions
- Over-Engineering
- Contradictions in previous responses

### Agent 4 – Cost & Complexity Controller (Fourth Speaker)

**Goal:** Provide pragmatic cost/risk analysis based on the conversation

**Input:**
- Original user idea
- Full conversation history (Agents 1, 2, 3)

**Output:**
- Implementation cost assessment
- Maintenance cost assessment
- Operational risk assessment
- Cognitive Load assessment
- **Conversational message** (response to the discussion)

**Conversational Rules:**
- Reference specific points: "Reality Checker mentioned dependency on X, which increases maintenance cost because..."
- Quantify where possible (time, $, effort levels)
- Be concise (max 200 words)
- Highlight hidden costs

### Agent 5 – Synthesizer (Final Speaker)

**Execution Condition:** No veto from Assassin

**Input:**
- Original user idea
- Full conversation transcript (Agents 1, 2, 3, 4)

**Output:**
- Final constrained version of the idea
- Open risks (consolidated from all agents)
- **Ranked recommendations** (1-3 options with justifications)
- **Conversational message** (final summary addressing the user)

**Conversational Rules:**
- Synthesize the debate: "The team identified 3 critical assumptions..."
- Acknowledge disagreements: "Refiner was optimistic, but Reality Checker and Assassin raised valid concerns..."
- Provide clear next steps
- Be decisive (max 250 words)

---

## 7. Hard System Rules (Conversational Model)

1. **Execution Order is Strict:** Refiner → Reality Checker → Assassin → Cost → Synthesizer (if no veto)
2. **Each Agent sees all previous messages** in the conversation thread
3. **Agents MUST reference previous responses explicitly** ("As Refiner noted...", "I disagree with Reality Checker because...")
4. **Assassin veto stops execution immediately** → Synthesizer never runs
5. **At least one Agent must challenge or oppose** a key assumption (Low Trust flag if all agree)
6. **Conversational messages are bounded:** max 250 words per agent
7. **Each response includes structured output + conversational message**
8. **No agent may change another agent's output** (conversation is append-only)

---

## 8. Functional Requirements

### FR-1: Agent Configuration
System must allow defining an Agent with:
- Role and execution order
- Dedicated LLM
- Custom Prompt template
- Conversation history access rules

### FR-2: Sequential Execution
System must execute Agents **in order**, passing the conversation history to each subsequent agent

### FR-3: Conversation State Management
System must maintain a conversation thread with:
- Message ordering (turn numbers)
- Agent attribution (who said what)
- Timestamps
- Ability to stop at veto

### FR-4: Veto as Terminal State
System must record Veto as a final state and prevent Synthesizer execution

### FR-5: Structured + Conversational Output
Each agent must produce:
- Structured data (JSON fields per schema)
- Natural language conversational message
- Both must be persisted and displayable

---

## 9. Non-Functional Requirements

- **Sequential execution latency:** Expect 5-10s per agent (total 25-50s for full round table)
- **Reproducible runs:** Same input + conversation order → same output (with deterministic LLM settings)
- **Complete conversation logging:** Every message, timestamp, and agent attribution must be persisted
- **Acceptable latency:** < 60s for MVP (includes all 5 agents)
- **Vendor-agnostic:** OpenAI, Gemini, Claude, etc.
- **Real-time streaming:** UI should stream each agent's message as it's generated (not wait for all agents)

---

## 10. Success Metrics

### ❌ Not Success if:

- Agents don't reference each other's points
- Conversation feels like 5 separate reports (no dialogue)
- All Agents agree without challenge
- User can't follow the logic of the debate
- Conversational messages are verbose or repetitive

### ✅ Success if:

- Ideas are rejected quickly with clear reasoning
- User can see how one agent's point influenced the next
- Disagreements are explicit and well-reasoned
- Assumptions are challenged and debated
- Stop decision is made rapidly with conversation evidence
- User understands the "why" behind the recommendation

---

## 11. MVP Scope

### Included:

- **Conversational Web UI** (chat-like thread showing each agent's message as it arrives)
- **5 fixed Agents** in strict order (Refiner → Reality → Assassin → Cost → Synthesizer)
- LLM selection per Agent
- **Streaming output** (messages appear as agents complete)
- Markdown / JSON output export
- Configuration file for Agent definitions (YAML / JSON)
- **Conversation transcript view** (full thread with timestamps)

### Not Included:

- Parallel execution mode
- Advanced UI (history, collaboration)
- Long-term memory across multiple runs
- Auto-iteration or multi-round debates
- Custom agent ordering (fixed sequence for MVP)

---

## 12. Risks & Considerations

- **Sequential execution is slower** (5-10x longer than parallel)
- **Agents may converge** instead of maintaining independence (prompt engineering critical)
- **Conversation bias:** later agents see earlier responses and may anchor
- **Verbosity risk:** Conversational messages may become too long
- **User over-reliance** on the conversation without checking structured data
- **Prompt design complexity:** Each agent needs conversation-aware prompts

---

## 13. Product Positioning

> **AI Round Table is not an inspiration tool.**
>
> It's a conversational decision-making tool where multiple expert agents debate your idea in real-time, helping you stop bad ideas before they become expensive.
>
> You watch the debate unfold, see how each expert challenges the others, and get a clear recommendation backed by structured reasoning.
