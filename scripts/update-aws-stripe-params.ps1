# Update AWS SSM Parameters for Stripe (PowerShell)
# Run this after you've created products in Stripe and updated .env.local

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🔧 UPDATING AWS SSM PARAMETERS FOR STRIPE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path .env.local)) {
    Write-Host "❌ Error: .env.local file not found!" -ForegroundColor Red
    exit 1
}

# Load environment variables from .env.local
$envVars = @{}
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Verify required variables
$requiredKeys = @('STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET')
foreach ($key in $requiredKeys) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Host "❌ Error: Missing $key in .env.local" -ForegroundColor Red
        exit 1
    }
}

# Verify price IDs
$priceKeys = @('STRIPE_PRICE_STARTER', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ELITE')
foreach ($key in $priceKeys) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Host "❌ Error: Missing $key in .env.local" -ForegroundColor Red
        Write-Host "   Make sure you've created products in Stripe and copied the price IDs!" -ForegroundColor Yellow
        exit 1
    }

    # Check if it starts with price_
    if (-not $envVars[$key].StartsWith('price_')) {
        Write-Host "❌ Error: $key must start with 'price_' not 'prod_'" -ForegroundColor Red
        Write-Host "   You may have copied Product IDs instead of Price IDs" -ForegroundColor Yellow
        Write-Host "   $key = $($envVars[$key])" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Found all required Stripe variables in .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "Updating AWS SSM parameters..." -ForegroundColor Cyan
Write-Host ""

# Function to update SSM parameter
function Update-SsmParameter {
    param (
        [string]$Name,
        [string]$Value
    )

    Write-Host "Updating: $Name"
    try {
        aws ssm put-parameter `
            --name "/spotter-app/$Name" `
            --value $Value `
            --type "SecureString" `
            --overwrite `
            --region us-east-1 `
            2>&1 | Out-Null
        Write-Host "  ✓ Updated successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to update: $_" -ForegroundColor Red
        throw
    }
}

# Update all Stripe parameters
try {
    Update-SsmParameter "STRIPE_SECRET_KEY" $envVars['STRIPE_SECRET_KEY']
    Update-SsmParameter "STRIPE_PUBLISHABLE_KEY" $envVars['STRIPE_PUBLISHABLE_KEY']
    Update-SsmParameter "STRIPE_WEBHOOK_SECRET" $envVars['STRIPE_WEBHOOK_SECRET']
    Update-SsmParameter "STRIPE_PRICE_STARTER" $envVars['STRIPE_PRICE_STARTER']
    Update-SsmParameter "STRIPE_PRICE_PRO" $envVars['STRIPE_PRICE_PRO']
    Update-SsmParameter "STRIPE_PRICE_ELITE" $envVars['STRIPE_PRICE_ELITE']

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "✅ ALL STRIPE PARAMETERS UPDATED IN AWS!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Deploy your app to AWS (docker build + push + ECS update)"
    Write-Host "2. Verify webhook is working: https://dashboard.stripe.com/test/webhooks"
    Write-Host "3. Test subscription flow on https://spotter.cannashieldct.com"
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Failed to update parameters: $_" -ForegroundColor Red
    exit 1
}
