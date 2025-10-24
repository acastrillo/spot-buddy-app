# Deploy Rate Limiting to AWS Production
# This script adds Upstash Redis credentials to AWS Parameter Store and updates the ECS service

param(
    [Parameter(Mandatory=$true)]
    [string]$UpstashUrl,

    [Parameter(Mandatory=$true)]
    [string]$UpstashToken,

    [string]$Region = "us-east-1",
    [string]$Cluster = "spotter-cluster",
    [string]$Service = "spotter-service",
    [string]$TaskFamily = "spotter-app-task"
)

Write-Host "🚀 Deploying Rate Limiting to Production" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Add parameters to AWS Parameter Store
Write-Host "📦 Step 1: Adding credentials to AWS Parameter Store..." -ForegroundColor Yellow

try {
    # Add UPSTASH_REDIS_REST_URL
    Write-Host "  → Adding UPSTASH_REDIS_REST_URL..."
    aws ssm put-parameter `
        --name "/spotter/prod/UPSTASH_REDIS_REST_URL" `
        --value $UpstashUrl `
        --type "SecureString" `
        --description "Upstash Redis REST URL for rate limiting" `
        --region $Region `
        --overwrite 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ UPSTASH_REDIS_REST_URL added successfully" -ForegroundColor Green
    } else {
        throw "Failed to add UPSTASH_REDIS_REST_URL"
    }

    # Add UPSTASH_REDIS_REST_TOKEN
    Write-Host "  → Adding UPSTASH_REDIS_REST_TOKEN..."
    aws ssm put-parameter `
        --name "/spotter/prod/UPSTASH_REDIS_REST_TOKEN" `
        --value $UpstashToken `
        --type "SecureString" `
        --description "Upstash Redis REST token for rate limiting" `
        --region $Region `
        --overwrite 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ UPSTASH_REDIS_REST_TOKEN added successfully" -ForegroundColor Green
    } else {
        throw "Failed to add UPSTASH_REDIS_REST_TOKEN"
    }
} catch {
    Write-Host "    ❌ Error adding parameters: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Verify parameters
Write-Host "🔍 Step 2: Verifying parameters..." -ForegroundColor Yellow

try {
    $params = aws ssm get-parameters `
        --names "/spotter/prod/UPSTASH_REDIS_REST_URL" "/spotter/prod/UPSTASH_REDIS_REST_TOKEN" `
        --region $Region `
        --query 'Parameters[*].Name' `
        --output json | ConvertFrom-Json

    if ($params.Count -eq 2) {
        Write-Host "  ✅ Both parameters verified in Parameter Store" -ForegroundColor Green
    } else {
        throw "Expected 2 parameters, found $($params.Count)"
    }
} catch {
    Write-Host "  ❌ Error verifying parameters: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Get AWS Account ID
Write-Host "🔑 Step 3: Getting AWS Account ID..." -ForegroundColor Yellow

try {
    $accountId = aws sts get-caller-identity --query 'Account' --output text
    Write-Host "  ✅ Account ID: $accountId" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error getting account ID: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Update IAM Role Permissions
Write-Host "🔐 Step 4: Updating IAM role permissions..." -ForegroundColor Yellow

# Get the task execution role ARN
try {
    $taskDef = aws ecs describe-task-definition `
        --task-definition $TaskFamily `
        --region $Region `
        --query 'taskDefinition.executionRoleArn' `
        --output text

    $roleName = $taskDef.Split('/')[-1]
    Write-Host "  → Found execution role: $roleName" -ForegroundColor Gray

    # Create IAM policy for SSM access
    $ssmPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": [
        "arn:aws:ssm:${Region}:${accountId}:parameter/spotter/prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:${Region}:${accountId}:key/*"
    }
  ]
}
"@

    # Save policy to temp file
    $ssmPolicy | Out-File -FilePath "temp-ssm-policy.json" -Encoding utf8

    # Attach policy to role
    aws iam put-role-policy `
        --role-name $roleName `
        --policy-name SpotterSSMAccess `
        --policy-document file://temp-ssm-policy.json

    # Clean up temp file
    Remove-Item "temp-ssm-policy.json" -Force

    Write-Host "  ✅ IAM permissions updated" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Warning: Could not update IAM role. You may need to do this manually." -ForegroundColor Yellow
    Write-Host "     Role: $roleName" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Get current task definition
Write-Host "📋 Step 5: Getting current task definition..." -ForegroundColor Yellow

try {
    $taskDefJson = aws ecs describe-task-definition `
        --task-definition $TaskFamily `
        --region $Region `
        --query 'taskDefinition' | ConvertFrom-Json

    Write-Host "  ✅ Current revision: $($taskDefJson.revision)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error getting task definition: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 6: Add environment variables to task definition
Write-Host "🔧 Step 6: Adding environment variables to task definition..." -ForegroundColor Yellow

try {
    # Build parameter ARNs
    $urlArn = "arn:aws:ssm:${Region}:${accountId}:parameter/spotter/prod/UPSTASH_REDIS_REST_URL"
    $tokenArn = "arn:aws:ssm:${Region}:${accountId}:parameter/spotter/prod/UPSTASH_REDIS_REST_TOKEN"

    # Get the container definition
    $containerDef = $taskDefJson.containerDefinitions[0]

    # Check if secrets array exists
    if (-not $containerDef.secrets) {
        $containerDef | Add-Member -MemberType NoteProperty -Name "secrets" -Value @()
    }

    # Add the new secrets (if they don't already exist)
    $existingUrls = $containerDef.secrets | Where-Object { $_.name -eq "UPSTASH_REDIS_REST_URL" }
    if (-not $existingUrls) {
        $containerDef.secrets += @{
            name = "UPSTASH_REDIS_REST_URL"
            valueFrom = $urlArn
        }
        Write-Host "  → Added UPSTASH_REDIS_REST_URL" -ForegroundColor Gray
    } else {
        Write-Host "  → UPSTASH_REDIS_REST_URL already exists, updating..." -ForegroundColor Gray
        $existingUrls[0].valueFrom = $urlArn
    }

    $existingTokens = $containerDef.secrets | Where-Object { $_.name -eq "UPSTASH_REDIS_REST_TOKEN" }
    if (-not $existingTokens) {
        $containerDef.secrets += @{
            name = "UPSTASH_REDIS_REST_TOKEN"
            valueFrom = $tokenArn
        }
        Write-Host "  → Added UPSTASH_REDIS_REST_TOKEN" -ForegroundColor Gray
    } else {
        Write-Host "  → UPSTASH_REDIS_REST_TOKEN already exists, updating..." -ForegroundColor Gray
        $existingTokens[0].valueFrom = $tokenArn
    }

    # Create new task definition JSON (only include required fields)
    $newTaskDef = @{
        family = $taskDefJson.family
        taskRoleArn = $taskDefJson.taskRoleArn
        executionRoleArn = $taskDefJson.executionRoleArn
        networkMode = $taskDefJson.networkMode
        containerDefinitions = @($containerDef)
        requiresCompatibilities = $taskDefJson.requiresCompatibilities
        cpu = $taskDefJson.cpu
        memory = $taskDefJson.memory
    }

    # Save to file
    $newTaskDef | ConvertTo-Json -Depth 10 | Out-File -FilePath "temp-task-def.json" -Encoding utf8

    Write-Host "  ✅ Task definition updated" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error updating task definition: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 7: Register new task definition
Write-Host "📝 Step 7: Registering new task definition..." -ForegroundColor Yellow

try {
    $newRevision = aws ecs register-task-definition `
        --cli-input-json file://temp-task-def.json `
        --region $Region `
        --query 'taskDefinition.revision' `
        --output text

    # Clean up temp file
    Remove-Item "temp-task-def.json" -Force

    Write-Host "  ✅ New revision registered: $newRevision" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error registering task definition: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 8: Update ECS service
Write-Host "🚢 Step 8: Deploying to ECS..." -ForegroundColor Yellow

try {
    aws ecs update-service `
        --cluster $Cluster `
        --service $Service `
        --task-definition "${TaskFamily}:${newRevision}" `
        --force-new-deployment `
        --region $Region `
        --no-cli-pager | Out-Null

    Write-Host "  ✅ Service update initiated" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error updating service: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 9: Monitor deployment
Write-Host "👀 Step 9: Monitoring deployment..." -ForegroundColor Yellow
Write-Host "  (This may take 2-3 minutes...)" -ForegroundColor Gray
Write-Host ""

$maxWaitTime = 300  # 5 minutes
$startTime = Get-Date
$deploymentComplete = $false

while (-not $deploymentComplete -and ((Get-Date) - $startTime).TotalSeconds -lt $maxWaitTime) {
    try {
        $service = aws ecs describe-services `
            --cluster $Cluster `
            --services $Service `
            --region $Region `
            --query 'services[0]' | ConvertFrom-Json

        $primaryDeployment = $service.deployments | Where-Object { $_.status -eq "PRIMARY" }

        $runningCount = $primaryDeployment.runningCount
        $desiredCount = $primaryDeployment.desiredCount

        Write-Host "  → Running: $runningCount / Desired: $desiredCount" -ForegroundColor Gray

        if ($runningCount -eq $desiredCount -and $service.deployments.Count -eq 1) {
            $deploymentComplete = $true
            Write-Host ""
            Write-Host "  ✅ Deployment complete!" -ForegroundColor Green
        } else {
            Start-Sleep -Seconds 10
        }
    } catch {
        Write-Host "  ⚠️  Error checking deployment status" -ForegroundColor Yellow
        break
    }
}

if (-not $deploymentComplete) {
    Write-Host ""
    Write-Host "  ⚠️  Deployment is taking longer than expected." -ForegroundColor Yellow
    Write-Host "     Check AWS Console or CloudWatch logs for details." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Rate Limiting Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check CloudWatch logs: aws logs tail /ecs/spotter-app --region us-east-1 --since 5m" -ForegroundColor Gray
Write-Host "2. Test rate limiting: node scripts/test-rate-limits.mjs" -ForegroundColor Gray
Write-Host "3. Monitor Upstash dashboard: https://console.upstash.com" -ForegroundColor Gray
Write-Host ""
