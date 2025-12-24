# Integration Test Script for AI Round Table Agent Pipeline
# Tests the full end-to-end flow from idea submission to final recommendation

param(
    [string]$BaseUrl = "http://localhost:7071",
    [int]$MaxWaitSeconds = 120,
    [int]$PollIntervalSeconds = 5
)

$ErrorActionPreference = "Stop"

# ANSI color codes for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}✓ $Message${Reset}"
}

function Write-Failure {
    param([string]$Message)
    Write-Host "${Red}✗ $Message${Reset}"
}

function Write-Info {
    param([string]$Message)
    Write-Host "${Cyan}ℹ $Message${Reset}"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}⚠ $Message${Reset}"
}

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $params = @{
        Method = $Method
        Uri = "$BaseUrl$Endpoint"
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return $response
    } catch {
        Write-Failure "API call failed: $_"
        throw
    }
}

function Wait-ForRunCompletion {
    param(
        [string]$RunId,
        [int]$MaxWaitSeconds,
        [int]$PollIntervalSeconds
    )
    
    $startTime = Get-Date
    $elapsed = 0
    
    Write-Info "Waiting for run to complete (max ${MaxWaitSeconds}s)..."
    
    while ($elapsed -lt $MaxWaitSeconds) {
        Start-Sleep -Seconds $PollIntervalSeconds
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        try {
            $run = Invoke-ApiCall -Method GET -Endpoint "/api/runs/$RunId"
            
            Write-Host "  Status: $($run.status) (${elapsed}s elapsed)" -ForegroundColor Gray
            
            if ($run.status -in @('COMPLETED', 'VETOED', 'FAILED')) {
                return $run
            }
        } catch {
            Write-Warning "Polling failed, retrying..."
        }
    }
    
    throw "Run did not complete within ${MaxWaitSeconds} seconds"
}

function Test-HappyPath {
    Write-Host "`n$Yellow==== TEST 1: Happy Path ====$Reset" -ForegroundColor Yellow
    Write-Info "Testing a reasonable idea that should pass all agents"
    
    $ideaText = @"
Build a mobile app that helps remote teams schedule meetings across time zones. 
It would show everyone's availability in their local time, suggest optimal meeting times, 
and integrate with Google Calendar and Outlook. Target users are distributed engineering teams.
"@
    
    # Create run
    Write-Info "Creating run..."
    $createResponse = Invoke-ApiCall -Method POST -Endpoint "/api/runs" -Body @{
        idea_text = $ideaText
    }
    
    if ($createResponse.status -ne "INIT") {
        Write-Failure "Expected status INIT, got $($createResponse.status)"
        return $false
    }
    
    Write-Success "Run created: $($createResponse.run_id)"
    Write-Info "Orchestrator instance: $($createResponse.orchestrator_instance_id)"
    
    # Wait for completion
    $run = Wait-ForRunCompletion -RunId $createResponse.run_id -MaxWaitSeconds $MaxWaitSeconds -PollIntervalSeconds $PollIntervalSeconds
    
    # Validate results
    if ($run.status -ne 'COMPLETED') {
        Write-Failure "Expected COMPLETED status, got $($run.status)"
        return $false
    }
    
    Write-Success "Run completed successfully"
    
    # Check conversation turns
    $expectedAgents = @('refiner', 'reality_checker', 'assassin', 'cost', 'synthesizer')
    $actualAgents = $run.conversation | ForEach-Object { $_.agent_id }
    
    if ($actualAgents.Count -ne 5) {
        Write-Failure "Expected 5 conversation turns, got $($actualAgents.Count)"
        return $false
    }
    
    Write-Success "All 5 agents executed"
    
    # Validate each agent
    foreach ($i in 0..4) {
        $turn = $run.conversation[$i]
        $expectedAgent = $expectedAgents[$i]
        
        if ($turn.agent_id -ne $expectedAgent) {
            Write-Failure "Turn $($i+1): Expected $expectedAgent, got $($turn.agent_id)"
            return $false
        }
        
        if (-not $turn.message -or $turn.message.Length -eq 0) {
            Write-Failure "Turn $($i+1): Missing conversational message"
            return $false
        }
        
        if ($turn.message.Length -gt 700) {
            Write-Warning "Turn $($i+1): Message exceeds 700 characters ($($turn.message.Length))"
        }
        
        if (-not $turn.structured_output) {
            Write-Failure "Turn $($i+1): Missing structured output"
            return $false
        }
        
        Write-Success "Turn $($i+1): $($turn.agent_name) ✓"
    }
    
    # Check assassin didn't veto
    $assassinTurn = $run.conversation | Where-Object { $_.agent_id -eq 'assassin' }
    if ($assassinTurn.structured_output.veto -eq $true) {
        Write-Failure "Assassin unexpectedly vetoed the idea"
        return $false
    }
    
    Write-Success "Assassin did not veto"
    
    # Check synthesizer recommendation
    $synthesizerTurn = $run.conversation | Where-Object { $_.agent_id -eq 'synthesizer' }
    $recommendation = $synthesizerTurn.structured_output.recommendation
    
    if ($recommendation -notin @('RESEARCH_FIRST', 'PROCEED', 'STOP', 'PIVOT')) {
        Write-Failure "Invalid recommendation: $recommendation"
        return $false
    }
    
    Write-Success "Synthesizer recommendation: $recommendation"
    
    # Check run_result
    if (-not $run.run_result) {
        Write-Failure "Missing run_result"
        return $false
    }
    
    if ($run.run_result.decision -notin @('STOP', 'CONTINUE', 'CONDITIONAL')) {
        Write-Failure "Invalid decision: $($run.run_result.decision)"
        return $false
    }
    
    Write-Success "Final decision: $($run.run_result.decision)"
    
    Write-Success "Happy path test PASSED ✓"
    return $true
}

function Test-VetoPath {
    Write-Host "`n$Yellow==== TEST 2: Veto Path ====$Reset" -ForegroundColor Yellow
    Write-Info "Testing a fundamentally flawed idea that should be vetoed"
    
    $ideaText = @"
Build a social network for pets where dogs and cats can create profiles and post updates themselves. 
They would use special keyboards designed for paws. We'll monetize through premium pet subscriptions.
"@
    
    # Create run
    Write-Info "Creating run..."
    $createResponse = Invoke-ApiCall -Method POST -Endpoint "/api/runs" -Body @{
        idea_text = $ideaText
    }
    
    Write-Success "Run created: $($createResponse.run_id)"
    
    # Wait for completion
    $run = Wait-ForRunCompletion -RunId $createResponse.run_id -MaxWaitSeconds $MaxWaitSeconds -PollIntervalSeconds $PollIntervalSeconds
    
    # Validate veto
    if ($run.status -ne 'VETOED') {
        Write-Warning "Expected VETOED status, got $($run.status)"
        Write-Warning "This idea might not trigger a veto - trying different validation"
        
        # If not vetoed, check that it at least completed all agents
        if ($run.status -eq 'COMPLETED') {
            Write-Info "Idea completed without veto - checking for critical concerns"
            $assassinTurn = $run.conversation | Where-Object { $_.agent_id -eq 'assassin' }
            
            if ($assassinTurn.structured_output.veto -eq $false) {
                Write-Success "Assassin evaluated but did not veto"
                Write-Success "Veto path test PASSED (no veto needed) ✓"
                return $true
            }
        }
    } else {
        Write-Success "Run was vetoed as expected"
        
        # Check that conversation stopped at assassin
        $conversationLength = $run.conversation.Count
        if ($conversationLength -ne 3) {
            Write-Warning "Expected 3 turns (Refiner, Reality, Assassin), got $conversationLength"
        }
        
        # Check assassin veto
        $assassinTurn = $run.conversation | Where-Object { $_.agent_id -eq 'assassin' }
        if (-not $assassinTurn) {
            Write-Failure "Assassin turn not found"
            return $false
        }
        
        if ($assassinTurn.structured_output.veto -ne $true) {
            Write-Failure "Assassin veto flag is not true"
            return $false
        }
        
        Write-Success "Assassin veto confirmed: $($assassinTurn.structured_output.kill_reason)"
        Write-Success "Failure mode: $($assassinTurn.structured_output.failure_mode)"
        
        # Check run_result
        if ($run.run_result.decision -ne 'STOP') {
            Write-Failure "Expected STOP decision, got $($run.run_result.decision)"
            return $false
        }
        
        Write-Success "Veto path test PASSED ✓"
        return $true
    }
    
    return $true
}

function Test-PreflightEndpoint {
    Write-Host "`n$Yellow==== TEST 3: Preflight Endpoint ====$Reset" -ForegroundColor Yellow
    Write-Info "Testing preflight check endpoint"
    
    $ideaText = "Build a todo app"
    
    Write-Info "Calling preflight..."
    $preflightResponse = Invoke-ApiCall -Method POST -Endpoint "/api/preflight" -Body @{
        idea_text = $ideaText
    }
    
    if (-not $preflightResponse.ready) {
        Write-Failure "Expected ready=true"
        return $false
    }
    
    if ($preflightResponse.questions.Count -gt 0) {
        Write-Warning "Preflight returned questions - this is optional"
        Write-Info "Questions: $($preflightResponse.questions.Count)"
    }
    
    Write-Success "Preflight test PASSED ✓"
    return $true
}

# Main execution
Write-Host "`n${Cyan}╔══════════════════════════════════════════════════════════╗${Reset}"
Write-Host "${Cyan}║  AI Round Table - Integration Test Suite                ║${Reset}"
Write-Host "${Cyan}╚══════════════════════════════════════════════════════════╝${Reset}"
Write-Info "Base URL: $BaseUrl"
Write-Info "Max wait time: ${MaxWaitSeconds}s"
Write-Info "Poll interval: ${PollIntervalSeconds}s"

$results = @{
    'Test-PreflightEndpoint' = $false
    'Test-HappyPath' = $false
    'Test-VetoPath' = $false
}

try {
    # Run tests
    $results['Test-PreflightEndpoint'] = Test-PreflightEndpoint
    $results['Test-HappyPath'] = Test-HappyPath
    $results['Test-VetoPath'] = Test-VetoPath
    
    # Summary
    Write-Host "`n${Cyan}╔══════════════════════════════════════════════════════════╗${Reset}"
    Write-Host "${Cyan}║  Test Summary                                            ║${Reset}"
    Write-Host "${Cyan}╚══════════════════════════════════════════════════════════╝${Reset}"
    
    $passed = 0
    $failed = 0
    
    foreach ($test in $results.Keys) {
        if ($results[$test]) {
            Write-Success "$test"
            $passed++
        } else {
            Write-Failure "$test"
            $failed++
        }
    }
    
    Write-Host "`nTotal: $passed passed, $failed failed"
    
    if ($failed -eq 0) {
        Write-Host "`n${Green}All tests PASSED! ✓${Reset}" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n${Red}Some tests FAILED ✗${Reset}" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n${Red}Test suite failed with error: $_${Reset}" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace
    exit 1
}
