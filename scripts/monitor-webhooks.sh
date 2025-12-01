#!/bin/bash

# Stripe Webhook Monitor
# Watches AWS CloudWatch logs for Stripe webhook events in real-time

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Monitoring Stripe Webhooks (Live)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Watching for:"
echo "  • checkout.session.completed"
echo "  • customer.subscription.created/updated"
echo "  • invoice.payment_succeeded/failed"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tail logs and filter for webhook-related events
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --region us-east-1 \
  --follow \
  --format short \
  --since 1m | grep -E "\[Webhook|\[resolve|checkout\.session|subscription\.|invoice\."
