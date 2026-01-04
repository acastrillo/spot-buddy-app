# PowerShell script to apply IAM policy with AWS Marketplace permissions
# This fixes the AWS Marketplace subscription error for Bedrock models

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "Applying IAM policy with AWS Marketplace permissions..." -ForegroundColor Yellow

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text)
if (-not $AccountId) {
    Write-Error "Failed to get AWS Account ID. Make sure AWS CLI is configured."
    exit 1
}
Write-Host "AWS Account ID: $AccountId" -ForegroundColor Green

# Read the policy file and replace account ID placeholders
$PolicyTemplate = Get-Content "c:\spot-buddy-web\scripts\iam-policy-update.json" -Raw
$PolicyDocument = $PolicyTemplate -replace "YOUR_ACCOUNT_ID", $AccountId
$PolicyDocument = $PolicyDocument -replace "920013187591", $AccountId

# Save the processed policy to a temp file
$TempPolicyFile = [System.IO.Path]::GetTempFileName()
$PolicyDocument | Out-File -FilePath $TempPolicyFile -Encoding utf8 -NoNewline

Write-Host "Applying policy to SpotterTaskRole..." -ForegroundColor Yellow

# Apply the policy
aws iam put-role-policy --role-name SpotterTaskRole --policy-name BedrockAndDynamoDBAccess --policy-document file://$TempPolicyFile

if ($LASTEXITCODE -ne 0) {
    Remove-Item $TempPolicyFile -ErrorAction SilentlyContinue
    Write-Error "Failed to apply policy to SpotterTaskRole"
    exit 1
}

# Clean up temp file
Remove-Item $TempPolicyFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "IAM policy applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "SpotterTaskRole now has permission to:" -ForegroundColor Green
Write-Host "  - Invoke Claude models on Bedrock (including 4.5 via inference profiles)" -ForegroundColor White
Write-Host "  - Subscribe to AWS Marketplace models (fixes the subscription error)" -ForegroundColor White
Write-Host "  - Run Bedrock batch inference jobs" -ForegroundColor White
Write-Host "  - Access DynamoDB tables (workouts, users, body-metrics, workout-completions, webhook-events)" -ForegroundColor White
Write-Host "  - Read/write batch inputs/outputs in spotter-ai-prompt-cache" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. The ECS task will automatically use the updated permissions" -ForegroundColor White
Write-Host "  2. Wait 5 minutes for the marketplace subscription to propagate" -ForegroundColor White
Write-Host "  3. Try the Enhance with AI feature again" -ForegroundColor White
Write-Host "  4. No redeployment needed - changes take effect immediately" -ForegroundColor White
Write-Host ""
