# Test script for Azure Functions endpoints

Write-Host "`n=== Testing Azure Functions Endpoints ===" -ForegroundColor Cyan

# Test 1: Preflight with short idea (should return clarification questions)
Write-Host "`n1. Testing POST /api/preflight (short idea)..." -ForegroundColor Yellow
try {
    $preflight1 = Invoke-RestMethod -Method Post `
        -Uri "http://localhost:7071/api/preflight" `
        -ContentType "application/json" `
        -Body '{"idea_text":"Build an app"}'
    
    Write-Host "✅ Response:" -ForegroundColor Green
    $preflight1 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 2: Preflight with detailed idea (should return ready=true)
Write-Host "`n2. Testing POST /api/preflight (detailed idea)..." -ForegroundColor Yellow
try {
    $preflight2 = Invoke-RestMethod -Method Post `
        -Uri "http://localhost:7071/api/preflight" `
        -ContentType "application/json" `
        -Body '{"idea_text":"Create a mobile application for tracking daily water intake. The app will remind users to drink water every 2 hours, track their consumption in ml, and generate weekly reports showing hydration patterns. Target users are health-conscious adults aged 25-45. Main problem solved is dehydration due to busy lifestyles. Tech stack: React Native for mobile, Node.js backend, PostgreSQL database."}'
    
    Write-Host "✅ Response:" -ForegroundColor Green
    $preflight2 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 3: Create run
Write-Host "`n3. Testing POST /api/create-run..." -ForegroundColor Yellow
try {
    $createRun = Invoke-RestMethod -Method Post `
        -Uri "http://localhost:7071/api/create-run" `
        -ContentType "application/json" `
        -Body '{"idea_text":"Build a mobile app for tracking daily water intake to help busy professionals stay hydrated throughout the day."}'
    
    Write-Host "✅ Response:" -ForegroundColor Green
    $createRun | ConvertTo-Json -Depth 5
    
    $runId = $createRun.run_id
    Write-Host "`nCreated run: $runId" -ForegroundColor Cyan
    
    # Test 4: Get run by ID
    Write-Host "`n4. Testing GET /api/runs/$runId..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    
    try {
        $getRun = Invoke-RestMethod -Uri "http://localhost:7071/api/runs/$runId"
        Write-Host "✅ Response:" -ForegroundColor Green
        $getRun | ConvertTo-Json -Depth 5
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 5: Get non-existent run (should return 404)
Write-Host "`n5. Testing GET /api/runs/non-existent (should 404)..." -ForegroundColor Yellow
try {
    $notFound = Invoke-RestMethod -Uri "http://localhost:7071/api/runs/run_2025-01-01_0000"
    Write-Host "⚠️  Unexpected success (should 404)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Correctly returned 404" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
