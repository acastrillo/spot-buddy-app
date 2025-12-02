# PowerShell script to add Bedrock permissions to SpotterTaskRole
# This fixes the "not authorized to perform: bedrock:InvokeModel" error

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "Adding Bedrock permissions to SpotterTaskRole..." -ForegroundColor Yellow

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text)
if (-not $AccountId) {
    Write-Error "Failed to get AWS Account ID. Make sure AWS CLI is configured."
    exit 1
}
Write-Host "AWS Account ID: $AccountId" -ForegroundColor Green

# Check if SpotterTaskRole exists
$roleExists = aws iam get-role --role-name SpotterTaskRole 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "SpotterTaskRole does not exist. Creating it..." -ForegroundColor Yellow

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

    aws iam create-role --role-name SpotterTaskRole --assume-role-policy-document $TrustPolicy
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create SpotterTaskRole"
        exit 1
    }
    Write-Host "SpotterTaskRole created" -ForegroundColor Green
}

# Create Bedrock policy
$BedrockPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:$($Region)::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
                "arn:aws:bedrock:$($Region)::foundation-model/anthropic.claude-3-5-sonnet-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:$($Region):$($AccountId):table/spotter-workouts",
                "arn:aws:dynamodb:$($Region):$($AccountId):table/spotter-users",
                "arn:aws:dynamodb:$($Region):$($AccountId):table/spotter-body-metrics"
            ]
        }
    ]
}
"@

Write-Host "Creating Bedrock and DynamoDB access policy..." -ForegroundColor Yellow
aws iam put-role-policy --role-name SpotterTaskRole --policy-name BedrockAndDynamoDBAccess --policy-document $BedrockPolicy

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to add policy to SpotterTaskRole"
    exit 1
}

Write-Host "Bedrock permissions added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "SpotterTaskRole now has permission to:" -ForegroundColor Green
Write-Host "  - Invoke Claude 3.5 Sonnet models on Bedrock" -ForegroundColor White
Write-Host "  - Access DynamoDB tables (workouts, users, body-metrics)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. The ECS task will automatically use the updated permissions" -ForegroundColor White
Write-Host "  2. Try the Enhance with AI feature again" -ForegroundColor White
Write-Host "  3. No redeployment needed - changes take effect immediately" -ForegroundColor White
