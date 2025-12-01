# Stripe Webhook Monitor (PowerShell)
# Watches AWS CloudWatch logs for Stripe webhook events in real-time

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 Monitoring Stripe Webhooks (Live)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Watching for:" -ForegroundColor Yellow
Write-Host "  • checkout.session.completed" -ForegroundColor Gray
Write-Host "  • customer.subscription.created/updated" -ForegroundColor Gray
Write-Host "  • invoice.payment_succeeded/failed" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Set environment variable for AWS CLI
$env:MSYS_NO_PATHCONV = "1"

# Tail logs and filter for webhook-related events
aws logs tail /ecs/spotter-app `
  --region us-east-1 `
  --follow `
  --format short `
  --since 1m `
  | Select-String -Pattern "Webhook|resolve|checkout|subscription|invoice"
