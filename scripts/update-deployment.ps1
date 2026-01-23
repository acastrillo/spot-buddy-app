# PowerShell script for quick deployment of Kinex Fit to AWS ECS
# This script updates an existing deployment (does not create new infrastructure)

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# AWS Configuration
$AccountId = "920013187591"
$EcrRepo = "$AccountId.dkr.ecr.$Region.amazonaws.com/spotter-app"
$ClusterName = "spotter-cluster"
$ServiceName = "spotter-web-service"
$AppUrl = "https://spotter.cannashieldct.com"

Write-Host "🚀 Starting Kinex Fit deployment to AWS ECS..." -ForegroundColor Green
Write-Host ""

# Step 1: Build Docker image
Write-Host "📦 Step 1/6: Building Docker image..." -ForegroundColor Yellow
docker build -t spotter-app .
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker build failed"
    exit 1
}
Write-Host "✅ Docker image built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Tag image for ECR
Write-Host "🏷️  Step 2/6: Tagging image for ECR..." -ForegroundColor Yellow
docker tag spotter-app:latest "$EcrRepo:latest"
Write-Host "✅ Image tagged: $EcrRepo:latest" -ForegroundColor Green
Write-Host ""

# Step 3: Login to ECR
Write-Host "🔐 Step 3/6: Logging into Amazon ECR..." -ForegroundColor Yellow
$LoginCommand = aws ecr get-login-password --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to get ECR login password"
    exit 1
}
$LoginCommand | docker login --username AWS --password-stdin $EcrRepo | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ ECR login failed"
    exit 1
}
Write-Host "✅ Logged into ECR successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Push image to ECR
Write-Host "📤 Step 4/6: Pushing image to ECR..." -ForegroundColor Yellow
docker push "$EcrRepo:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to push image to ECR"
    exit 1
}
Write-Host "✅ Image pushed to ECR successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Update ECS service
Write-Host "🔄 Step 5/6: Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service `
    --cluster $ClusterName `
    --service $ServiceName `
    --force-new-deployment `
    --region $Region `
    --output json | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to update ECS service"
    exit 1
}
Write-Host "✅ ECS service update initiated" -ForegroundColor Green
Write-Host ""

# Step 6: Monitor deployment
Write-Host "⏳ Step 6/6: Monitoring deployment (this may take 2-5 minutes)..." -ForegroundColor Yellow
Write-Host "Waiting for deployment to complete..." -ForegroundColor Blue

# Poll deployment status
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $deploymentStatus = (aws ecs describe-services `
        --cluster $ClusterName `
        --services $ServiceName `
        --region $Region `
        --query 'services[0].deployments[?status==`PRIMARY`] | [0].rolloutState' `
        --output text)

    if ($deploymentStatus -eq "COMPLETED") {
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
        break
    }
    elseif ($deploymentStatus -eq "FAILED") {
        Write-Error "❌ Deployment failed"
        Write-Host "Check service events:" -ForegroundColor Yellow
        Write-Host "aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region --query 'services[0].events[0:5]'" -ForegroundColor Blue
        exit 1
    }
    else {
        Write-Host "Deployment status: $deploymentStatus (attempt $($attempt + 1)/$maxAttempts)" -ForegroundColor Blue
        Start-Sleep -Seconds 10
    }

    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "⚠️  Deployment monitoring timed out, but deployment may still be in progress" -ForegroundColor Yellow
    Write-Host "Check status: aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Green
Write-Host "1. Visit your app: $AppUrl" -ForegroundColor Blue
Write-Host "2. Monitor logs: aws logs tail /ecs/spotter-app --follow --region $Region" -ForegroundColor Blue
Write-Host "3. Check service: aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region" -ForegroundColor Blue
Write-Host ""
