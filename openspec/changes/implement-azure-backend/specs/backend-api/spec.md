# Backend API Specification Delta

## ADDED Requirements

### Requirement: Supabase Edge Functions API Endpoints
The backend SHALL implement three RESTful API endpoints using Supabase Edge Functions to handle preflight validation, run creation, and run status retrieval.

#### Scenario: Preflight validation with clarification questions
- GIVEN a user submits an idea text of less than 50 characters
- WHEN the POST /preflight endpoint is called with the short idea
- THEN the response SHALL return `ready: false`
- AND SHALL return at least one clarification question with id, question text, and required flag
- AND SHALL generate a unique preflight_id

#### Scenario: Preflight validation passes immediately
- GIVEN a user submits a well-formed idea with clear problem and user statements
- WHEN the POST /preflight endpoint is called
- THEN the response SHALL return `ready: true`
- AND SHALL return an empty questions array
- AND SHALL include a preflight_id for reference

### Requirement: Asynchronous Run Creation
The backend SHALL create evaluation runs asynchronously, returning immediately with a run identifier while agent processing happens in the background.

#### Scenario: Create run and return immediately
- GIVEN a valid idea text and optional clarifications
- WHEN POST /runs endpoint is called
- THEN a new run record SHALL be inserted into the database with status="INIT"
- AND a unique run_id SHALL be generated in format "run_YYYY-MM-DD_NNNN"
- AND the response SHALL return within 200ms
- AND background orchestration SHALL be triggered without blocking the response

#### Scenario: Invalid idea text is rejected
- GIVEN an empty idea_text or null value
- WHEN POST /runs endpoint is called
- THEN the response SHALL return HTTP 400 Bad Request
- AND SHALL include an error message describing the validation failure

### Requirement: Real-time Run Status Polling
The backend SHALL provide a polling endpoint that returns the current status and conversation history of an evaluation run.

#### Scenario: Poll run in progress
- GIVEN a run with status="AGENTS_RUNNING" and 2 completed conversation turns
- WHEN GET /runs/:id endpoint is called
- THEN the response SHALL return status="AGENTS_RUNNING"
- AND SHALL include conversation object with 2 turns
- AND SHALL include current_agent_index=2
- AND SHALL include total_agents=5

#### Scenario: Poll completed run
- GIVEN a run with status="COMPLETED" and all 5 agents finished
- WHEN GET /runs/:id endpoint is called
- THEN the response SHALL return status="COMPLETED"
- AND SHALL include conversation object with 5 turns
- AND SHALL include result object with final synthesis
- AND SHALL include completed_at timestamp

#### Scenario: Poll vetoed run
- GIVEN a run where the Assassin agent vetoed the idea
- WHEN GET /runs/:id endpoint is called
- THEN the response SHALL return status="VETOED"
- AND SHALL include conversation object with exactly 3 turns (Refiner, Reality, Assassin)
- AND SHALL include veto reason in the Assassin's structured output

### Requirement: Error Handling and Resilience
The backend SHALL handle OpenAI API failures, timeouts, and rate limits gracefully with retry logic and informative error responses.

#### Scenario: OpenAI rate limit encountered
- GIVEN the OpenAI API returns a 429 rate limit error
- WHEN an agent is being executed
- THEN the backend SHALL retry the request after exponential backoff delay
- AND SHALL retry up to 3 times
- AND if all retries fail, SHALL update run status to "FAILED" with error code "RATE_LIMIT_EXCEEDED"

#### Scenario: Agent execution timeout
- GIVEN an agent execution exceeds 30 seconds
- WHEN processing a conversation turn
- THEN the backend SHALL cancel the request
- AND SHALL update run status to "FAILED" with error code "AGENT_TIMEOUT"
- AND SHALL include the timed-out agent name in error details

#### Scenario: Database connection failure
- GIVEN a database connection error occurs during run creation
- WHEN POST /runs is called
- THEN the response SHALL return HTTP 500 Internal Server Error
- AND SHALL log the database error with full stack trace
- AND SHALL NOT expose internal database details to the client

### Requirement: Authentication and Authorization (Future)
The backend SHALL prepare for future user authentication using Supabase Auth with Row Level Security policies defined but not enforced in MVP.

#### Scenario: RLS policies defined but permissive for MVP
- GIVEN the database schema is deployed
- WHEN tables are created
- THEN Row Level Security SHALL be enabled on runs and conversation_turns tables
- AND policies SHALL be created to allow future user-scoped access
- BUT policies SHALL permit anonymous access for MVP testing

## MODIFIED Requirements
*(None - This is a new backend implementation)*

## REMOVED Requirements
*(None - This is a new backend implementation)*
