#!/usr/bin/env pwsh

Write-Host "🚀 Deploying Knowledge Base to AWS..." -ForegroundColor Cyan

# Build
Write-Host "`n📦 Building Docker image..." -ForegroundColor Yellow
docker build -t spotter-app:knowledge-base .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Tag
Write-Host "`n🏷️  Tagging images..." -ForegroundColor Yellow
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Login
Write-Host "`n🔐 Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 381491991512.dkr.ecr.us-east-1.amazonaws.com

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECR login failed!" -ForegroundColor Red
    exit 1
}

# Push
Write-Host "`n⬆️  Pushing to ECR..." -ForegroundColor Yellow
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "`n🔄 Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --force-new-deployment `
  --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECS update failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green
Write-Host "`nMonitor deployment:" -ForegroundColor Cyan
Write-Host "  ECS Console: https://us-east-1.console.aws.amazon.com/ecs/v2/clusters/spotter-cluster/services/spotter-service" -ForegroundColor Gray
Write-Host "`nCheck logs with:" -ForegroundColor Cyan
Write-Host "  MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --follow" -ForegroundColor Gray
Write-Host "`nVerify health:" -ForegroundColor Cyan
Write-Host "  curl https://spotter.cannashieldct.com/api/health" -ForegroundColor Gray
