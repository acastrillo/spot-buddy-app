# Health Check Script for Spotter App
# Verifies deployment is running correctly

Write-Host "`n===========================================`n" -ForegroundColor Cyan
Write-Host "  Spotter App Health Check" -ForegroundColor Cyan
Write-Host "`n===========================================`n" -ForegroundColor Cyan

# 1. Check ECS Task Status
Write-Host "[1/5] Checking ECS Task Status..." -ForegroundColor Yellow
$taskStatus = aws ecs describe-services `
    --cluster SpotterCluster `
    --services spotter-app `
    --region us-east-1 `
    --query 'services[0].{desiredCount: desiredCount, runningCount: runningCount, status: status, deployments: deployments[0].rolloutState}' `
    --output json | ConvertFrom-Json

if ($taskStatus.status -eq "ACTIVE" -and $taskStatus.runningCount -eq $taskStatus.desiredCount) {
    Write-Host "  ✅ ECS Service: ACTIVE" -ForegroundColor Green
    Write-Host "  ✅ Running Tasks: $($taskStatus.runningCount)/$($taskStatus.desiredCount)" -ForegroundColor Green
    Write-Host "  ✅ Deployment: $($taskStatus.deployments)" -ForegroundColor Green
} else {
    Write-Host "  ❌ ECS Service Status: $($taskStatus.status)" -ForegroundColor Red
    Write-Host "  ❌ Running Tasks: $($taskStatus.runningCount)/$($taskStatus.desiredCount)" -ForegroundColor Red
    exit 1
}

# 2. Check App URL Responds
Write-Host "`n[2/5] Checking App URL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://spotter.cannashieldct.com" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ App URL: Responding (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  App URL: Responding but unexpected status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ App URL: Not responding - $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check Auth API Endpoint
Write-Host "`n[3/5] Checking Auth API..." -ForegroundColor Yellow
try {
    $authResponse = Invoke-WebRequest -Uri "https://spotter.cannashieldct.com/api/auth/signin" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($authResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Auth API: Responding (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Auth API: Unexpected status: $($authResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 405) {
        Write-Host "  ✅ Auth API: Responding (405 = Method Not Allowed, expected for GET)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Auth API: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Check DynamoDB Table
Write-Host "`n[4/5] Checking DynamoDB Table..." -ForegroundColor Yellow
$tableStatus = aws dynamodb describe-table `
    --table-name spotter-users `
    --region us-east-1 `
    --query 'Table.{Status: TableStatus, ItemCount: ItemCount, GSIs: GlobalSecondaryIndexes[*].{Name: IndexName, Status: IndexStatus}}' `
    --output json | ConvertFrom-Json

if ($tableStatus.Status -eq "ACTIVE") {
    Write-Host "  ✅ Table Status: ACTIVE" -ForegroundColor Green
    Write-Host "  ✅ Item Count: $($tableStatus.ItemCount)" -ForegroundColor Green

    $emailIndex = $tableStatus.GSIs | Where-Object { $_.Name -eq "email-index" }
    $stripeIndex = $tableStatus.GSIs | Where-Object { $_.Name -eq "stripeCustomerId-index" }

    if ($emailIndex -and $emailIndex.Status -eq "ACTIVE") {
        Write-Host "  ✅ email-index: ACTIVE" -ForegroundColor Green
    } else {
        Write-Host "  ❌ email-index: MISSING or INACTIVE" -ForegroundColor Red
    }

    if ($stripeIndex -and $stripeIndex.Status -eq "ACTIVE") {
        Write-Host "  ✅ stripeCustomerId-index: ACTIVE" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  stripeCustomerId-index: MISSING (create with: node scripts/create-stripe-customer-gsi.mjs)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Table Status: $($tableStatus.Status)" -ForegroundColor Red
}

# 5. Check Recent Logs for Errors
Write-Host "`n[5/5] Checking Recent Logs..." -ForegroundColor Yellow
$logOutput = aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --format short 2>&1 | Out-String
$errorCount = ($logOutput -split "`n" | Where-Object { $_ -match "ERROR|Error|error" -and $_ -notmatch "allowDangerousEmailAccountLinking" }).Count

if ($errorCount -eq 0) {
    Write-Host "  ✅ No errors in last 5 minutes" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Found $errorCount error lines in last 5 minutes" -ForegroundColor Yellow
    Write-Host "     Run: aws logs tail /ecs/spotter-app --region us-east-1 --since 5m" -ForegroundColor Gray
}

# Summary
Write-Host "`n===========================================`n" -ForegroundColor Cyan
Write-Host "  Health Check Complete!" -ForegroundColor Cyan
Write-Host "`n===========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Create stripeCustomerId-index GSI (if missing):" -ForegroundColor White
Write-Host "     node scripts/create-stripe-customer-gsi.mjs" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Verify Stripe webhook configured:" -ForegroundColor White
Write-Host "     https://dashboard.stripe.com/test/webhooks" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start testing:" -ForegroundColor White
Write-Host "     See: PRE-TEST-VERIFICATION-REPORT.md" -ForegroundColor Gray
Write-Host ""
