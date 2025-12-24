# Database Schema Specification Delta

## ADDED Requirements

### Requirement: PostgreSQL Database Schema
The backend SHALL use PostgreSQL (via Supabase) with three primary tables to store run metadata, conversation history, and agent configuration.

#### Scenario: Create new run record
- GIVEN a user submits an idea for evaluation
- WHEN the create-run endpoint processes the request
- THEN a new row SHALL be inserted into the runs table
- AND SHALL include id (UUID), run_id (human-readable), status, idea_text, created_at
- AND status SHALL default to "INIT"
- AND created_at SHALL default to current timestamp

#### Scenario: Update run status to completed
- GIVEN all 5 agents have finished executing
- WHEN the orchestration pipeline completes
- THEN the runs table row SHALL be updated with status="COMPLETED"
- AND completed_at SHALL be set to the current timestamp
- AND updated_at SHALL be automatically updated via trigger

### Requirement: Conversation Turns Persistence
The backend SHALL persist every agent's conversation turn immediately after execution to ensure no data loss during long-running processes.

#### Scenario: Save conversation turn after agent execution
- GIVEN an agent completes its analysis and returns both conversational_message and structured_output
- WHEN the orchestration pipeline processes the agent response
- THEN a new row SHALL be inserted into conversation_turns table
- AND SHALL include run_id (foreign key), turn_number, agent_id, agent_name, conversational_message, structured_output (JSONB), timestamp
- AND conversational_message SHALL be validated to be ≤700 characters
- AND structured_output SHALL be stored as JSONB for efficient querying

#### Scenario: Query conversation history for agent context
- GIVEN an agent is about to execute (e.g., Reality Checker as turn 2)
- WHEN building the conversation history for context
- THEN conversation_turns SHALL be queried filtered by run_id
- AND SHALL be ordered by turn_number ASC
- AND previous turns (turn 1) SHALL be included in the agent prompt

### Requirement: Agent Configuration Storage
The backend SHALL store agent prompt templates and configuration in a dedicated table to enable future customization without code changes.

#### Scenario: Load agent prompts from database
- GIVEN the orchestration pipeline needs to execute the Refiner agent
- WHEN preparing the agent prompt
- THEN agent_config table SHALL be queried for agent_id="refiner"
- AND the prompt_template SHALL be retrieved
- AND SHALL be parameterized with idea_text and conversation history

#### Scenario: Seed default agent configuration
- GIVEN the database schema is deployed for the first time
- WHEN initialization runs
- THEN 5 rows SHALL be inserted into agent_config (one per agent)
- AND SHALL include agent_id, agent_name, display_order, prompt_template, is_enabled
- AND all agents SHALL have is_enabled=true by default

### Requirement: Database Indexes for Performance
The backend SHALL create indexes on frequently queried columns to ensure sub-200ms query times for run and conversation lookups.

#### Scenario: Fast lookup by run_id
- GIVEN a user polls for run status via GET /runs/:id
- WHEN the database queries the runs table
- THEN an index on runs.run_id SHALL ensure query completes in <50ms
- AND an index on conversation_turns.run_id SHALL ensure joins complete in <100ms

#### Scenario: Fast lookup by status for monitoring
- GIVEN an admin dashboard queries for all runs with status="FAILED"
- WHEN the query executes
- THEN an index on runs.status SHALL enable fast filtering
- AND the query SHALL return results in <200ms even with thousands of runs

### Requirement: Automatic Timestamp Management
The backend SHALL use database triggers to automatically update the updated_at timestamp on runs whenever any field changes.

#### Scenario: Update run status updates timestamp
- GIVEN a run's status changes from "AGENTS_RUNNING" to "COMPLETED"
- WHEN the UPDATE statement executes
- THEN the updated_at field SHALL be automatically set to NOW()
- AND no explicit UPDATE of updated_at is required in application code

### Requirement: Data Integrity Constraints
The backend SHALL enforce foreign key constraints and check constraints to prevent invalid data states.

#### Scenario: Prevent orphaned conversation turns
- GIVEN a conversation turn references a run_id that doesn't exist
- WHEN INSERT into conversation_turns is attempted
- THEN the database SHALL reject the insert with foreign key violation
- AND SHALL return an error to the application

#### Scenario: Enforce valid status values
- GIVEN an attempt to update run status to an invalid value like "UNKNOWN"
- WHEN the UPDATE statement executes
- THEN the database SHALL reject the update due to CHECK constraint
- AND SHALL only allow: "INIT", "AGENTS_RUNNING", "VETOED", "SYNTHESIZING", "COMPLETED", "FAILED"

#### Scenario: Prevent duplicate run_id
- GIVEN a run_id "run_2025-12-24_0001" already exists
- WHEN INSERT with the same run_id is attempted
- THEN the database SHALL reject the insert due to UNIQUE constraint violation
- AND the application SHALL generate a new incremented run_id

### Requirement: Row Level Security Preparation
The backend SHALL enable Row Level Security on all tables with policies defined for future multi-user access, but permissive for MVP.

#### Scenario: RLS enabled but not enforced for MVP
- GIVEN the database schema is deployed
- WHEN tables are created
- THEN ALTER TABLE statements SHALL enable RLS on runs, conversation_turns, agent_config
- AND policies SHALL be created with TO public USING (true) for MVP access
- AND policies SHALL be ready to be tightened when auth.uid() is available

## MODIFIED Requirements
*(None - This is a new database implementation)*

## REMOVED Requirements
*(None - This is a new database implementation)*
