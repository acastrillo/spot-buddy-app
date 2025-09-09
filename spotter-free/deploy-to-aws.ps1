# PowerShell script to deploy Spotter App to AWS
# Run this script from PowerShell in your project directory

param(
    [Parameter(Mandatory=$true)]
    [string]$OpenAIKey,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ClusterName = "spotter-cluster"
)

Write-Host "🚀 Starting Spotter App deployment to AWS..." -ForegroundColor Green

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text)
if (-not $AccountId) {
    Write-Error "❌ Failed to get AWS Account ID. Make sure AWS CLI is configured."
    exit 1
}
Write-Host "✅ AWS Account ID: $AccountId" -ForegroundColor Green

# Variables
$EcrRepo = "$AccountId.dkr.ecr.$Region.amazonaws.com/spotter-app"
$TaskFamily = "spotter-app-task"
$ServiceName = "spotter-service"

Write-Host "📦 Step 1: Creating ECR repository..." -ForegroundColor Yellow
aws ecr create-repository --repository-name spotter-app --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ECR repository created successfully" -ForegroundColor Green
} else {
    Write-Host "ℹ️  ECR repository already exists" -ForegroundColor Blue
}

Write-Host "🏗️  Step 2: Building Docker image..." -ForegroundColor Yellow
docker build -t spotter-app .
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker build failed"
    exit 1
}
Write-Host "✅ Docker image built successfully" -ForegroundColor Green

Write-Host "🔑 Step 3: Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrRepo
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ ECR login failed"
    exit 1
}
Write-Host "✅ Logged into ECR successfully" -ForegroundColor Green

Write-Host "📤 Step 4: Pushing image to ECR..." -ForegroundColor Yellow
docker tag spotter-app:latest "$EcrRepo:latest"
docker push "$EcrRepo:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to push image to ECR"
    exit 1
}
Write-Host "✅ Image pushed to ECR successfully" -ForegroundColor Green

Write-Host "🔐 Step 5: Storing OpenAI API key in AWS Systems Manager..." -ForegroundColor Yellow
aws ssm put-parameter --name "/spotter-app/openai-api-key" --value $OpenAIKey --type "SecureString" --overwrite --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to store OpenAI API key"
    exit 1
}
Write-Host "✅ OpenAI API key stored securely" -ForegroundColor Green

Write-Host "📋 Step 6: Creating ECS task execution role..." -ForegroundColor Yellow
$TrustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@

aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document $TrustPolicy 2>$null
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Additional policy for Systems Manager access
$SsmPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            "Resource": "arn:aws:ssm:$Region:$AccountId:parameter/spotter-app/*"
        }
    ]
}
"@

aws iam put-role-policy --role-name ecsTaskExecutionRole --policy-name SsmParameterAccess --policy-document $SsmPolicy

Write-Host "✅ ECS execution role configured" -ForegroundColor Green

Write-Host "📝 Step 7: Updating task definition with account details..." -ForegroundColor Yellow
$TaskDefContent = Get-Content "aws-task-definition.json" -Raw
$TaskDefContent = $TaskDefContent -replace "YOUR_ACCOUNT_ID", $AccountId
$TaskDefContent = $TaskDefContent -replace "us-east-1", $Region
$TaskDefContent | Set-Content "aws-task-definition-updated.json"

Write-Host "🎯 Step 8: Creating ECS cluster..." -ForegroundColor Yellow
aws ecs create-cluster --cluster-name $ClusterName --region $Region 2>$null
Write-Host "✅ ECS cluster ready" -ForegroundColor Green

Write-Host "📋 Step 9: Creating CloudWatch log group..." -ForegroundColor Yellow
aws logs create-log-group --log-group-name "/ecs/spotter-app" --region $Region 2>$null
Write-Host "✅ CloudWatch log group created" -ForegroundColor Green

Write-Host "📋 Step 10: Registering task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://aws-task-definition-updated.json --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to register task definition"
    exit 1
}
Write-Host "✅ Task definition registered" -ForegroundColor Green

Write-Host "🌐 Step 11: Creating Application Load Balancer..." -ForegroundColor Yellow

# Get default VPC and subnets
$VpcId = (aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region)
$SubnetIds = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text --region $Region)
$SubnetArray = $SubnetIds -split "\s+"

if ($SubnetArray.Count -lt 2) {
    Write-Error "❌ Need at least 2 subnets for ALB. Please use a different VPC or create more subnets."
    exit 1
}

# Create security group for ALB
$AlbSgId = (aws ec2 create-security-group --group-name spotter-alb-sg --description "Security group for Spotter ALB" --vpc-id $VpcId --query "GroupId" --output text --region $Region)
aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region
aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region

# Create security group for ECS tasks
$EcsSgId = (aws ec2 create-security-group --group-name spotter-ecs-sg --description "Security group for Spotter ECS tasks" --vpc-id $VpcId --query "GroupId" --output text --region $Region)
aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 3000 --source-group $AlbSgId --region $Region

# Create ALB
$AlbArn = (aws elbv2 create-load-balancer --name spotter-alb --subnets $SubnetArray[0] $SubnetArray[1] --security-groups $AlbSgId --query "LoadBalancers[0].LoadBalancerArn" --output text --region $Region)

# Create target group
$TgArn = (aws elbv2 create-target-group --name spotter-tg --protocol HTTP --port 3000 --vpc-id $VpcId --target-type ip --health-check-path "/" --query "TargetGroups[0].TargetGroupArn" --output text --region $Region)

# Create listener
aws elbv2 create-listener --load-balancer-arn $AlbArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgArn --region $Region

Write-Host "✅ Load balancer created" -ForegroundColor Green

Write-Host "🚀 Step 12: Creating ECS service..." -ForegroundColor Yellow
$ServiceConfig = @"
{
    "serviceName": "$ServiceName",
    "cluster": "$ClusterName",
    "taskDefinition": "$TaskFamily",
    "desiredCount": 1,
    "launchType": "FARGATE",
    "networkConfiguration": {
        "awsvpcConfiguration": {
            "subnets": ["$($SubnetArray[0])", "$($SubnetArray[1])"],
            "securityGroups": ["$EcsSgId"],
            "assignPublicIp": "ENABLED"
        }
    },
    "loadBalancers": [
        {
            "targetGroupArn": "$TgArn",
            "containerName": "spotter-app",
            "containerPort": 3000
        }
    ]
}
"@

$ServiceConfig | Set-Content "service-config.json"
aws ecs create-service --cli-input-json file://service-config.json --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to create ECS service"
    exit 1
}

Write-Host "✅ ECS service created successfully!" -ForegroundColor Green

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Getting your application URL..." -ForegroundColor Yellow

# Get ALB DNS name
$AlbDns = (aws elbv2 describe-load-balancers --load-balancer-arns $AlbArn --query "LoadBalancers[0].DNSName" --output text --region $Region)

Write-Host "🌐 Your Spotter app is available at: http://$AlbDns" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Note: It may take 2-3 minutes for the service to be fully ready." -ForegroundColor Yellow
Write-Host "📊 Check service status with: aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region" -ForegroundColor Blue

# Cleanup temporary files
Remove-Item "aws-task-definition-updated.json" -ErrorAction SilentlyContinue
Remove-Item "service-config.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Wait 2-3 minutes for deployment to complete" -ForegroundColor White
Write-Host "2. Visit your app at: http://$AlbDns" -ForegroundColor White
Write-Host "3. (Optional) Set up a custom domain and SSL certificate" -ForegroundColor White
Write-Host "4. (Optional) Set up monitoring and alerts" -ForegroundColor White