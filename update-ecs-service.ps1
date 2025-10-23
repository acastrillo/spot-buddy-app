# Update ECS service with new task definition (includes NEXTAUTH_URL fix)
# Run this after storing secrets in Parameter Store

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",

    [Parameter(Mandatory=$false)]
    [string]$ClusterName = "Spot BuddyCluster",

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "spotter-app"
)

Write-Host "🚀 Updating ECS service with NextAuth fix..." -ForegroundColor Green
Write-Host ""

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text)
if (-not $AccountId) {
    Write-Error "❌ Failed to get AWS Account ID. Make sure AWS CLI is configured."
    exit 1
}
Write-Host "✅ AWS Account ID: $AccountId" -ForegroundColor Green

# Update task definition with account ID
Write-Host "📝 Updating task definition with account details..." -ForegroundColor Yellow
$TaskDefContent = Get-Content "aws-task-definition.json" -Raw
$TaskDefContent = $TaskDefContent -replace "YOUR_ACCOUNT_ID", $AccountId
$TaskDefContent | Set-Content "aws-task-definition-updated.json"
Write-Host "✅ Task definition updated" -ForegroundColor Green

# Register new task definition
Write-Host "📋 Registering new task definition..." -ForegroundColor Yellow
$RegisterResult = aws ecs register-task-definition `
    --cli-input-json file://aws-task-definition-updated.json `
    --region $Region | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to register task definition"
    exit 1
}

$NewRevision = $RegisterResult.taskDefinition.revision
$TaskFamily = $RegisterResult.taskDefinition.family
Write-Host "✅ Task definition registered: $TaskFamily:$NewRevision" -ForegroundColor Green

# Update ECS service to use new task definition
Write-Host "🔄 Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service `
    --cluster $ClusterName `
    --service $ServiceName `
    --task-definition "${TaskFamily}:${NewRevision}" `
    --force-new-deployment `
    --region $Region | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to update ECS service"
    exit 1
}

Write-Host "✅ ECS service update initiated" -ForegroundColor Green
Write-Host ""

# Monitor deployment
Write-Host "⏳ Waiting for deployment to complete..." -ForegroundColor Yellow
Write-Host "   This may take 2-3 minutes..." -ForegroundColor Gray
Write-Host ""

$maxWaitTime = 300 # 5 minutes
$startTime = Get-Date

while ((Get-Date) -lt $startTime.AddSeconds($maxWaitTime)) {
    $service = aws ecs describe-services `
        --cluster $ClusterName `
        --services $ServiceName `
        --region $Region | ConvertFrom-Json

    $deployment = $service.services[0].deployments | Where-Object { $_.taskDefinition -match "$NewRevision" }

    if ($deployment.runningCount -eq $service.services[0].desiredCount) {
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Google sign-in should now work correctly!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🌐 Test at: https://spotter.cannashieldct.com" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📋 What was fixed:" -ForegroundColor Yellow
        Write-Host "   ✅ Added NEXTAUTH_URL=https://spotter.cannashieldct.com" -ForegroundColor White
        Write-Host "   ✅ Added AUTH_TRUST_HOST=true" -ForegroundColor White
        Write-Host "   ✅ Configured secrets from Parameter Store" -ForegroundColor White

        # Cleanup
        Remove-Item "aws-task-definition-updated.json" -ErrorAction SilentlyContinue
        exit 0
    }

    Start-Sleep -Seconds 10
}

Write-Host "⚠️  Deployment is taking longer than expected" -ForegroundColor Yellow
Write-Host "   Check status: aws ecs describe-services --cluster '$ClusterName' --services $ServiceName --region $Region" -ForegroundColor Gray

# Cleanup
Remove-Item "aws-task-definition-updated.json" -ErrorAction SilentlyContinue
