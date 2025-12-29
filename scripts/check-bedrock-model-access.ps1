# Check Bedrock Model Access Status
# This script helps diagnose AWS Bedrock model access issues

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Bedrock Model Access Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check AWS credentials
Write-Host "[1/4] Checking AWS credentials..." -ForegroundColor Yellow
$AccountId = aws sts get-caller-identity --query Account --output text 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "      checkmark Connected to AWS Account: $AccountId" -ForegroundColor Green
} else {
    Write-Host "      x Failed to get AWS credentials" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check IAM role permissions
Write-Host "[2/4] Checking IAM role permissions..." -ForegroundColor Yellow
$PolicyJson = aws iam get-role-policy --role-name SpotterTaskRole --policy-name BedrockAndDynamoDBAccess --region $Region 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($PolicyJson -match "aws-marketplace") {
        Write-Host "      checkmark IAM permissions include aws-marketplace actions" -ForegroundColor Green
    } else {
        Write-Host "      x IAM permissions missing aws-marketplace actions" -ForegroundColor Red
    }
} else {
    Write-Host "      x SpotterTaskRole or BedrockAndDynamoDBAccess policy not found" -ForegroundColor Red
}
Write-Host ""

# List available foundation models
Write-Host "[3/4] Checking available Claude models..." -ForegroundColor Yellow
$ModelsJson = aws bedrock list-foundation-models --region $Region --by-provider anthropic --output json 2>&1
if ($LASTEXITCODE -eq 0) {
    $Models = $ModelsJson | ConvertFrom-Json
    $ClaudeCount = ($Models.modelSummaries | Where-Object { $_.modelId -like '*claude*' }).Count
    Write-Host "      checkmark Found $ClaudeCount Claude models available" -ForegroundColor Green
} else {
    Write-Host "      x Failed to list models - may indicate lack of Bedrock access" -ForegroundColor Red
}
Write-Host ""

# Check inference profiles
Write-Host "[4/4] Checking cross-region inference profiles..." -ForegroundColor Yellow
$ProfilesJson = aws bedrock list-inference-profiles --region $Region --output json 2>&1
if ($LASTEXITCODE -eq 0) {
    $Profiles = $ProfilesJson | ConvertFrom-Json
    $ClaudeProfiles = $Profiles.inferenceProfileSummaries | Where-Object { $_.inferenceProfileId -like 'us.anthropic.claude*' }
    if ($ClaudeProfiles.Count -gt 0) {
        Write-Host "      checkmark Found $($ClaudeProfiles.Count) Claude inference profiles" -ForegroundColor Green
    } else {
        Write-Host "      ! No Claude inference profiles found - model access may not be granted" -ForegroundColor Yellow
    }
} else {
    Write-Host "      ! Unable to list inference profiles (command may not be available)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnosis Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "REQUIRED ACTION:" -ForegroundColor Yellow
Write-Host "If you're seeing 'Model access is denied' errors, you need to:" -ForegroundColor White
Write-Host ""
Write-Host "1. Go to AWS Console > Bedrock > Model access" -ForegroundColor Cyan
Write-Host "   URL: https://console.aws.amazon.com/bedrock/home?region=$Region#/modelaccess" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Click 'Request model access' or 'Manage model access'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Enable access for these Anthropic Claude models:" -ForegroundColor Cyan
Write-Host "   - Claude 4.5 Haiku" -ForegroundColor Gray
Write-Host "   - Claude 4.5 Sonnet" -ForegroundColor Gray
Write-Host "   - Claude 4.5 Opus (optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Accept the EULA and submit the request" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Wait 1-2 minutes for access to be granted (usually instant)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Model access is a one-time setup per AWS account." -ForegroundColor Yellow
Write-Host "      This is separate from IAM permissions and must be done through the console." -ForegroundColor Yellow
Write-Host ""
