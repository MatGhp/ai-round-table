# Quick Test Script - Single Run Test
# Simpler version for quick testing during development

param(
    [string]$BaseUrl = "http://localhost:7071",
    [string]$IdeaText = "Build a mobile app for tracking personal fitness goals with AI-powered workout recommendations"
)

$ErrorActionPreference = "Stop"

Write-Host "Testing AI Round Table Pipeline" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Create run
Write-Host "`nCreating run..." -ForegroundColor Yellow
$body = @{
    idea_text = $IdeaText
} | ConvertTo-Json

$response = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/runs" -Body $body -ContentType "application/json"

Write-Host "✓ Run created: $($response.run_id)" -ForegroundColor Green
Write-Host "  Orchestrator: $($response.orchestrator_instance_id)" -ForegroundColor Gray
Write-Host "  Status: $($response.status)" -ForegroundColor Gray

# Poll for completion
Write-Host "`nPolling for completion..." -ForegroundColor Yellow

$maxAttempts = 24  # 2 minutes with 5s intervals
$attempt = 0

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 5
    $attempt++
    
    try {
        $run = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/runs/$($response.run_id)"
        
        $elapsed = $attempt * 5
        Write-Host "  [$elapsed`s] Status: $($run.status) | Turns: $($run.conversation.Count)" -ForegroundColor Gray
        
        if ($run.status -in @('COMPLETED', 'VETOED', 'FAILED')) {
            Write-Host "`n✓ Run finished with status: $($run.status)" -ForegroundColor Green
            
            # Display conversation
            Write-Host "`nConversation:" -ForegroundColor Cyan
            foreach ($turn in $run.conversation) {
                Write-Host "`n  [$($turn.turn_number)] $($turn.agent_name)" -ForegroundColor Yellow
                $message = $turn.message.Substring(0, [Math]::Min(200, $turn.message.Length))
                Write-Host "    $message..." -ForegroundColor White
            }
            
            # Display result
            if ($run.run_result) {
                Write-Host "`nFinal Result:" -ForegroundColor Cyan
                Write-Host "  Decision: $($run.run_result.decision)" -ForegroundColor White
                if ($run.run_result.recommendation) {
                    Write-Host "  Recommendation: $($run.run_result.recommendation)" -ForegroundColor White
                }
                if ($run.run_result.veto_reason) {
                    Write-Host "  Veto Reason: $($run.run_result.veto_reason)" -ForegroundColor Red
                }
            }
            
            Write-Host "`n✓ Test completed successfully!" -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "  Polling error (will retry): $_" -ForegroundColor Red
    }
}

Write-Host "`n✗ Run did not complete within timeout" -ForegroundColor Red
exit 1
