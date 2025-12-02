# Store secrets in AWS Systems Manager Parameter Store
# Run this script to securely store your environment variables for ECS

$Region = "us-east-1"

Write-Host "Storing secrets in AWS Systems Manager Parameter Store..." -ForegroundColor Green
Write-Host ""

if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    $envVars = @{}

    foreach ($line in $envContent) {
        if ($line -match '^([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            $envVars[$key] = $value
        }
    }

    $secrets = @(
        "AUTH_SECRET",
        "COGNITO_CLIENT_ID",
        "COGNITO_CLIENT_SECRET",
        "COGNITO_USER_POOL_ID",
        "COGNITO_ISSUER_URL",
        "AWS_REGION",
        "APIFY_API_TOKEN",
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRICE_STARTER",
        "STRIPE_PRICE_PRO",
        "STRIPE_PRICE_ELITE"
    )

    $aliases = @{
        "STRIPE_PUBLISHABLE_KEY" = @("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
        "STRIPE_PRICE_STARTER"   = @("NEXT_PUBLIC_STRIPE_PRICE_STARTER")
        "STRIPE_PRICE_PRO"       = @("NEXT_PUBLIC_STRIPE_PRICE_PRO")
        "STRIPE_PRICE_ELITE"     = @("NEXT_PUBLIC_STRIPE_PRICE_ELITE")
    }

    foreach ($secret in $secrets) {
        if ($envVars.ContainsKey($secret)) {
            $value = $envVars[$secret]
            $paramName = "/spotter-app/$secret"

            Write-Host "Storing $secret..." -ForegroundColor Yellow

            aws ssm put-parameter `
                --name $paramName `
                --value $value `
                --type "SecureString" `
                --region $Region `
                --overwrite 2>$null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  -> Stored $secret" -ForegroundColor Green
            } else {
                Write-Host "  -> Failed to store $secret" -ForegroundColor Red
            }

            if ($aliases.ContainsKey($secret)) {
                foreach ($alias in $aliases[$secret]) {
                    $aliasParamName = "/spotter-app/$alias"

                    Write-Host "Storing $alias..." -ForegroundColor Yellow

                    aws ssm put-parameter `
                        --name $aliasParamName `
                        --value $value `
                        --type "SecureString" `
                        --region $Region `
                        --overwrite 2>$null

                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "  -> Stored $alias" -ForegroundColor Green
                    } else {
                        Write-Host "  -> Failed to store $alias" -ForegroundColor Red
                    }
                }
            }
        } else {
            Write-Host "$secret not found in .env.local" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "All requested secrets have been processed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update the ECS task definition to reference the new secrets." -ForegroundColor White
    Write-Host "2. Redeploy the ECS service so the new environment variables are available." -ForegroundColor White
} else {
    Write-Error ".env.local file not found. Please create it with your secrets first."
    exit 1
}
