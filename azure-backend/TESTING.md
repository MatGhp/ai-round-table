# Integration Testing Guide

## Overview

This directory contains integration tests for the AI Round Table agent pipeline. The tests validate the full end-to-end flow from idea submission to final recommendation.

## Test Scripts

### `test-integration.ps1`

Comprehensive test suite with multiple test cases:

**Test 1: Happy Path**
- Submits a reasonable idea
- Validates all 5 agents execute
- Checks conversation turns
- Verifies final COMPLETED status
- Validates structured outputs

**Test 2: Veto Path**
- Submits a fundamentally flawed idea
- Expects Assassin to veto
- Validates early termination
- Checks VETOED status

**Test 3: Preflight Endpoint**
- Tests preflight check endpoint
- Validates response format

**Usage:**
```powershell
# Run all tests against local instance
.\test-integration.ps1

# Custom configuration
.\test-integration.ps1 -BaseUrl "http://localhost:7071" -MaxWaitSeconds 120 -PollIntervalSeconds 5
```

### `test-quick.ps1`

Simplified single-run test for quick validation during development.

**Usage:**
```powershell
# Quick test with default idea
.\test-quick.ps1

# Custom idea
.\test-quick.ps1 -IdeaText "Build a todo app with AI"

# Against deployed instance
.\test-quick.ps1 -BaseUrl "https://your-function-app.azurewebsites.net"
```

## Prerequisites

1. **Azure Functions running locally:**
   ```bash
   npm run build
   func start
   ```

2. **Environment variables configured:**
   - `COSMOS_CONNECTION_STRING`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`

3. **CosmosDB container created:**
   - Database: `RoundTable`
   - Container: `runs`
   - Partition key: `/id`

## Expected Behavior

### Happy Path Flow
```
POST /api/runs
  ↓
Status: INIT
  ↓
Status: AGENTS_RUNNING
  ↓
Turn 1: Refiner
Turn 2: Reality Checker
Turn 3: Assassin (no veto)
  ↓
Status: SYNTHESIZING
  ↓
Turn 4: Cost Analyst
Turn 5: Synthesizer
  ↓
Status: COMPLETED
```

### Veto Path Flow
```
POST /api/runs
  ↓
Status: INIT
  ↓
Status: AGENTS_RUNNING
  ↓
Turn 1: Refiner
Turn 2: Reality Checker
Turn 3: Assassin (VETO)
  ↓
Status: VETOED (early termination)
```

## Performance Targets

- **Full pipeline:** < 60 seconds
- **Average per agent:** ~10-15 seconds
- **Veto path:** < 30 seconds (early termination)

## Validation Checklist

- [ ] All 5 agents execute (happy path)
- [ ] Conversation messages ≤ 700 characters
- [ ] Structured outputs present for all turns
- [ ] Assassin veto logic works correctly
- [ ] Final status is COMPLETED or VETOED
- [ ] run_result document created
- [ ] Error handling for API failures
- [ ] Retry logic handles rate limits

## Troubleshooting

**Test timeout:**
- Check Azure Functions logs for errors
- Verify Azure OpenAI endpoint is reachable
- Check rate limits on OpenAI API

**Missing conversation turns:**
- Verify all agent activities are registered
- Check orchestrator logs
- Validate CosmosDB permissions

**Veto not triggering:**
- Try more obviously flawed ideas
- Check Assassin prompt configuration
- Review structured output schema

## Manual Testing

To manually test individual endpoints:

**Preflight:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:7071/api/preflight" `
  -ContentType "application/json" `
  -Body '{"idea_text":"Build an app"}'
```

**Create Run:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:7071/api/runs" `
  -ContentType "application/json" `
  -Body '{"idea_text":"Build an AI assistant"}'
```

**Get Run:**
```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:7071/api/runs/{run_id}"
```

## CI/CD Integration

To integrate with CI/CD pipelines:

```yaml
- name: Run Integration Tests
  run: |
    cd azure-backend
    pwsh -File test-integration.ps1 -BaseUrl "http://localhost:7071"
```
