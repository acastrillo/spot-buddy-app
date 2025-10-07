# Monitoring & Logging Plan for Spot Buddy

## Executive Summary

Based on comprehensive research of monitoring solutions for our Next.js production app on AWS ECS Fargate, this document provides cost analysis and implementation recommendations.

**Recommended Solution: AWS CloudWatch + Sentry (Hybrid)**
- **Total Monthly Cost**: $50-80
- **Setup Time**: 8-10 hours
- **Best Balance**: Cost, functionality, and operational simplicity

---

## Application Context

**Current Architecture:**
- Next.js 15.5.1 on AWS ECS Fargate (1 container)
- DynamoDB for data storage
- AWS Cognito for authentication
- AWS Textract for OCR
- S3 for image storage
- Application Load Balancer with HTTPS
- Domain: https://spotter.cannashieldct.com

**Projected Usage (6 months):**
- 100-500 active users
- 10,000-50,000 API requests/day (~300k-1.5M/month)
- 5-10 GB logs/month
- Need to track: API errors, auth failures, DynamoDB throttles, OCR quota issues, performance bottlenecks

---

## Solution Comparison Matrix

### 1. AWS CloudWatch (Native AWS Solution)

**Monthly Cost: $25-60**

**Cost Breakdown:**
- Log ingestion (8 GB): $4/month ($0.50/GB)
- Custom metrics (50 metrics): $15/month ($0.30/metric)
- Basic alerting: Included
- Synthetic monitoring (optional): +$30-50/month

**Setup Time:** 8-12 hours

**Pros:**
- ✅ Native AWS integration (zero config for ECS, DynamoDB, ALB, S3)
- ✅ Automatic metric collection from all AWS services
- ✅ Cost-effective for infrastructure monitoring
- ✅ SNS integration for email/SMS alerts
- ✅ No additional vendor dependencies

**Cons:**
- ❌ Limited application-level error tracking
- ❌ No automatic error grouping or context preservation
- ❌ No session replay or user experience monitoring
- ❌ Manual stack trace analysis required
- ❌ Basic search/query capabilities
- ❌ Long-term log retention gets expensive

**Best For:** Infrastructure monitoring, AWS service metrics, basic application logs

---

### 2. Sentry (Error Tracking & APM)

**Monthly Cost: $26-55**

**Cost Breakdown:**
- Developer plan: $26/month (annual billing)
- Includes: Error monitoring, tracing, email alerts, custom dashboards
- Additional quota: $0.00036 per additional error event
- AI debugging (optional): +$25/month

**Setup Time:** 2-4 hours

**Pros:**
- ✅ Exceptional Next.js integration (automated wizard setup)
- ✅ Detailed error context (user info, browser, request params, full stack traces)
- ✅ Automatic error grouping and deduplication
- ✅ Performance monitoring (page loads, API response times, DB queries)
- ✅ Source map support for production builds
- ✅ Release tracking and deployment correlation
- ✅ User feedback integration
- ✅ Slack/webhook integrations

**Cons:**
- ❌ No infrastructure monitoring
- ❌ No log aggregation
- ❌ No session replay
- ❌ Requires errors to occur (reactive, not proactive)

**Best For:** Application error tracking, performance monitoring, user-centric debugging

---

### 3. LogRocket (Session Replay & Analytics)

**Monthly Cost: $99-300**

**Cost Breakdown:**
- Team plan: $99/month for 10,000 sessions
- Professional plan: Custom pricing (typically $200-300)
- Includes: Session replay, error reporting, analytics
- Conditional recording add-on available

**Setup Time:** 4-6 hours

**Pros:**
- ✅ Video-like session replay of user interactions
- ✅ AI-powered struggle detection
- ✅ Heatmaps and conversion funnel analysis
- ✅ JavaScript error detection with session context
- ✅ Excellent UX debugging capabilities

**Cons:**
- ❌ Expensive for high-engagement apps
- ❌ Privacy concerns for fitness/health data
- ❌ Limited backend/infrastructure monitoring
- ❌ No API monitoring
- ❌ Session-based pricing can escalate quickly

**Best For:** User experience optimization, conversion analysis, UX debugging

---

### 4. Datadog (Enterprise APM)

**Monthly Cost: $200-500**

**Cost Breakdown:**
- Infrastructure Pro: $15/host/month
- APM Pro: $31/host/month
- Log management: $0.10/GB ingestion + retention costs
- Synthetic monitoring: $6/test/month
- RUM (Real User Monitoring): $1.50/1000 sessions
- Total estimated: $200-500/month depending on features

**Setup Time:** 16-24 hours

**Pros:**
- ✅ Comprehensive full-stack observability
- ✅ End-to-end transaction tracing
- ✅ Advanced correlation across all stack layers
- ✅ ML-based anomaly detection
- ✅ Best-in-class dashboards and visualizations
- ✅ Enterprise-grade alerting

**Cons:**
- ❌ Very expensive for startups
- ❌ Complex pricing model (hard to predict costs)
- ❌ Overwhelming feature set for small teams
- ❌ Significant learning curve
- ❌ 20-40% of typical startup infrastructure budget

**Best For:** Enterprise applications, large teams, complex distributed systems

---

### 5. Better Stack (Log Management & Monitoring)

**Monthly Cost: $20-35**

**Cost Breakdown:**
- Hobby plan: $20/month (promotional pricing from $25)
  - 10 monitors/heartbeats
  - Slack/email alerts
  - 1 status page
  - 3 GB logs (3-day retention)
  - 2B metrics (30-day retention)
- Production bundles: $29-34/month
  - 30-day log retention
  - 13-month metrics retention
  - Unlimited querying

**Setup Time:** 6-8 hours

**Pros:**
- ✅ Extremely cost-effective
- ✅ Simple, predictable pricing (no per-host/per-user charges)
- ✅ Unified interface for logs, metrics, and monitoring
- ✅ Drag-and-drop query builder (SQL & PromQL)
- ✅ Built-in incident management and status pages
- ✅ Automatic log pattern detection
- ✅ Multi-location uptime monitoring
- ✅ OpenTelemetry support

**Cons:**
- ❌ Basic APM (not as advanced as Datadog/New Relic)
- ❌ Limited transaction tracing
- ❌ No code-level profiling
- ❌ Fewer customization options than enterprise tools

**Best For:** Startups prioritizing cost and simplicity, essential monitoring needs

---

### 6. Alternative Solutions

**Prometheus + Grafana (Open Source)**
- **Cost:** $50-100/month (infrastructure hosting)
- **Setup:** 20-30 hours initial + 2-3 hours weekly maintenance
- **Pros:** Unlimited customization, no licensing costs, scales infinitely
- **Cons:** High operational overhead, steep learning curve, no session replay/error tracking

**New Relic Free Tier**
- **Cost:** Free (100 GB/month), then $0.30/GB
- **Setup:** 8-12 hours
- **Pros:** Generous free tier, full platform access
- **Cons:** Costs escalate quickly after 100 GB, user-based pricing ($549/user for full access)

---

## Recommended Solution: CloudWatch + Sentry Hybrid

### Why This Combination?

1. **Optimal Cost:** $50-80/month total (CloudWatch $25-60 + Sentry $26-55)
2. **Comprehensive Coverage:** Infrastructure (CloudWatch) + Application (Sentry)
3. **Quick Setup:** 8-10 hours total
4. **Production-Ready:** Addresses all critical monitoring requirements
5. **Scalable:** Grows with usage without major platform changes

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Spot Buddy Application                   │
│  (Next.js 15 on ECS Fargate)                                │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
    ┌───────────────────────┐    ┌───────────────────────┐
    │   AWS CloudWatch      │    │      Sentry           │
    │                       │    │                       │
    │ • ECS Metrics         │    │ • Error Tracking      │
    │ • DynamoDB Metrics    │    │ • Stack Traces        │
    │ • ALB Metrics         │    │ • Performance APM     │
    │ • S3 Metrics          │    │ • User Context        │
    │ • Log Aggregation     │    │ • Release Tracking    │
    │ • CloudWatch Alarms   │    │ • Slack Alerts        │
    └───────────────────────┘    └───────────────────────┘
                │                             │
                └──────────┬──────────────────┘
                           ▼
                  ┌─────────────────┐
                  │  Alert Channels │
                  │  • Email        │
                  │  • Slack        │
                  │  • PagerDuty    │
                  └─────────────────┘
```

### What Each Tool Handles

**AWS CloudWatch:**
- ECS Fargate container CPU/memory usage
- DynamoDB read/write capacity, throttles, latencies
- ALB request counts, response times, 4xx/5xx errors
- S3 bucket size, request metrics
- Infrastructure-level logs from all AWS services
- Cost anomaly detection
- Resource utilization trends

**Sentry:**
- JavaScript errors (client-side)
- API route errors (server-side)
- Authentication failures with user context
- Performance monitoring (page loads, API endpoints)
- Database query performance
- OCR quota tracking errors
- User-reported issues
- Deployment impact analysis

---

## Implementation Plan

### Phase 1: Critical Monitoring (Week 1) - 8-10 hours

**AWS CloudWatch Setup (4-6 hours):**
1. Configure CloudWatch Logs groups for ECS containers
2. Enable container insights for ECS Fargate
3. Create custom metrics for:
   - Authentication success/failure rates
   - OCR quota usage
   - Workout creation/update operations
4. Set up CloudWatch Alarms:
   - Container CPU > 80%
   - Container Memory > 80%
   - DynamoDB throttling events
   - ALB 5xx error rate > 1%
5. Configure SNS topics for email alerts
6. Create basic dashboard for infrastructure health

**Sentry Setup (2-4 hours):**
1. Install Sentry SDK: `npx @sentry/wizard@latest -i nextjs`
2. Configure environment variables:
   ```
   NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
   SENTRY_ORG=<your-org>
   SENTRY_PROJECT=<your-project>
   SENTRY_AUTH_TOKEN=<your-token>
   ```
3. Configure sampling rates for production:
   - Error sampling: 100%
   - Performance sampling: 25% (for cost control)
4. Set up Slack integration for critical errors
5. Configure user context tracking (link errors to userId)
6. Create custom error boundaries for React components
7. Test error tracking with sample errors

**Deliverables:**
- ✅ All infrastructure metrics visible in CloudWatch
- ✅ All application errors tracked in Sentry
- ✅ Alerts configured for critical issues
- ✅ Team has access to both platforms

---

### Phase 2: Enhanced Monitoring (Week 2-3) - 4-6 hours

**Advanced CloudWatch:**
1. Implement custom business metrics:
   - Daily active users
   - Workouts saved per day
   - OCR usage trends
2. Create detailed dashboards:
   - User engagement metrics
   - API performance by endpoint
   - Cost breakdown by service
3. Set up CloudWatch Insights queries for common debugging scenarios
4. Configure log retention policies (7 days for debug logs, 30 days for errors)

**Advanced Sentry:**
1. Configure performance monitoring for key transactions:
   - Workout save operation
   - OCR processing
   - Authentication flow
2. Set up release tracking in CI/CD
3. Create custom Sentry dashboards for:
   - Error trends by release
   - Performance metrics by page
   - User impact analysis
4. Configure issue ownership and assignment rules

**Deliverables:**
- ✅ Business metrics tracked and visualized
- ✅ Performance baselines established
- ✅ Automated release tracking

---

### Phase 3: Optimization (Week 4+) - Ongoing

**Continuous Improvement:**
1. Review alert noise and adjust thresholds
2. Add custom alerts based on actual usage patterns
3. Implement automated remediation for common issues
4. Create runbooks for common alert scenarios
5. Optimize log sampling to reduce costs
6. Review and adjust retention policies

**Cost Optimization:**
- Review CloudWatch custom metric usage monthly
- Adjust Sentry sampling rates based on error volume
- Archive old logs to S3 for compliance
- Monitor spending and adjust as needed

---

## Cost Analysis

### Monthly Cost Breakdown (Hybrid Solution)

**AWS CloudWatch:**
- Log ingestion (8 GB): $4.00
- Custom metrics (50 metrics): $15.00
- Log storage (30 days): ~$1.00
- Alarms (10 alarms): Included (first 10 free)
- **CloudWatch Total: $20-30/month**

**Sentry:**
- Developer plan (annual): $26.00/month
- Expected quota usage: Included
- **Sentry Total: $26/month**

**Grand Total: $46-56/month**

### Cost Comparison (6 Months)

| Solution | Monthly | 6-Month Total | Setup Time |
|----------|---------|---------------|------------|
| **CloudWatch + Sentry** | **$50-80** | **$300-480** | **8-10h** |
| Better Stack | $20-35 | $120-210 | 6-8h |
| LogRocket | $99-300 | $594-1800 | 4-6h |
| Datadog | $200-500 | $1200-3000 | 16-24h |
| CloudWatch Only | $25-60 | $150-360 | 4-6h |
| Sentry Only | $26-55 | $156-330 | 2-4h |

### ROI Justification

**Cost of NOT Having Monitoring:**
- Average downtime cost: $5,600/hour (industry average)
- Average time to detect issues without monitoring: 2-4 hours
- Average time to detect WITH monitoring: 5-15 minutes
- **Potential savings from ONE incident: $5,000-10,000**

**User Retention Impact:**
- 88% of users won't return after a bad experience
- Monitoring enables proactive issue resolution
- Faster bug fixes = higher user satisfaction
- **Value: Unmeasurable but critical for growth**

---

## Alternative Budget Recommendation

### If Budget is Extremely Tight: Better Stack ($20-35/month)

**Why Better Stack:**
- Covers 80% of monitoring needs at 40% of hybrid cost
- Simple setup and maintenance
- Unified platform (less tool switching)
- Predictable pricing (no surprises)

**Trade-offs:**
- Less sophisticated error tracking than Sentry
- Basic APM vs. CloudWatch's deep AWS integration
- Acceptable for MVP phase, can upgrade later

---

## Migration Path for Growth

### When to Upgrade (Future Considerations)

**Scenario 1: Rapid User Growth (1000+ users)**
- Consider upgrading Sentry to Team plan ($80/month)
- Add LogRocket for session replay ($99/month)
- **Total: $150-200/month**

**Scenario 2: Enterprise Customers**
- Consider migrating to Datadog for compliance/SLA requirements
- Implement comprehensive observability
- **Total: $300-500/month**

**Scenario 3: Mobile App Launch**
- Add Sentry for mobile (React Native)
- Implement mobile-specific performance monitoring
- **Additional: $50-100/month**

---

## Success Metrics

### KPIs to Track (Post-Implementation)

**Operational Metrics:**
- Mean Time to Detection (MTTD): Target < 5 minutes
- Mean Time to Resolution (MTTR): Target < 30 minutes
- Alert noise ratio: Target < 10% false positives
- Monitoring coverage: Target > 95% of critical paths

**Business Metrics:**
- Reduction in customer-reported bugs: Target 50% reduction
- Application uptime: Target 99.9%
- API error rate: Target < 0.5%
- User satisfaction score: Track monthly

---

## Implementation Checklist

### Pre-Implementation
- [ ] Create AWS IAM roles for CloudWatch access
- [ ] Set up Sentry account and project
- [ ] Configure environment variables for both platforms
- [ ] Set up Slack channels for alerts
- [ ] Document current baseline metrics (errors, performance)

### CloudWatch Setup
- [ ] Enable container insights on ECS cluster
- [ ] Configure CloudWatch Logs groups
- [ ] Create custom metrics for business operations
- [ ] Set up CloudWatch Alarms for critical thresholds
- [ ] Configure SNS topics for notifications
- [ ] Create CloudWatch Dashboards
- [ ] Test alerting workflow

### Sentry Setup
- [ ] Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Configure Sentry environment variables
- [ ] Set up source map uploads
- [ ] Configure sampling rates
- [ ] Integrate with Slack
- [ ] Set up user context tracking
- [ ] Create Sentry dashboards
- [ ] Test error capture and alerting

### Post-Implementation
- [ ] Document runbooks for common alerts
- [ ] Train team on monitoring platforms
- [ ] Schedule weekly metric review meetings
- [ ] Set up monthly cost review process
- [ ] Create incident response procedures

---

## Conclusion

The **CloudWatch + Sentry hybrid approach** provides the best balance of cost, functionality, and operational simplicity for Spot Buddy's current stage. At $50-80/month with 8-10 hours setup time, this solution addresses all critical monitoring requirements while maintaining startup-friendly costs.

### Next Steps

1. **Week 1:** Implement Phase 1 (Critical Monitoring)
2. **Week 2-3:** Add Phase 2 (Enhanced Monitoring)
3. **Week 4+:** Optimize based on actual usage patterns
4. **Month 2:** Review costs and adjust retention policies
5. **Month 3:** Evaluate upgrade needs based on user growth

This plan provides production-grade monitoring capabilities that will scale with Spot Buddy's growth from beta through public launch and beyond.

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Next Review:** After Phase 1 implementation
