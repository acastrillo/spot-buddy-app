# Quick update deployment script
$Region = "us-east-1"
$AccountId = "920013187591"
$EcrRepo = "$AccountId.dkr.ecr.$Region.amazonaws.com/spotter-app"

Write-Host "🏗️  Building Docker image..." -ForegroundColor Yellow
docker build -t spotter-app . --no-cache
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "🔐 Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrRepo
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "📤 Pushing to ECR..." -ForegroundColor Yellow
docker tag spotter-app:latest "$EcrRepo:latest"
docker push "$EcrRepo:latest"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "🚀 Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment --region $Region

Write-Host "✅ Deployment started! Checking status..." -ForegroundColor Green
Write-Host "Monitor logs: MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow" -ForegroundColor Cyan
