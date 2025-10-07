# Spot Buddy - AWS Cost Analysis & Profitability Model

**Analysis Date**: January 2025
**Current Status**: Phase 3 Complete (Production on AWS)

---

## Current Infrastructure Overview

### AWS Resources
- **ECS Fargate**: 1 task (0.25 vCPU, 0.5 GB RAM)
- **Application Load Balancer**: 1 ALB with HTTPS
- **DynamoDB**: 2 tables (spotter-users, spotter-workouts)
- **Cognito**: User authentication
- **Route53**: DNS hosting
- **ECR**: Docker image registry
- **S3**: Image uploads (spotter-uploads-920013187591)
- **Textract**: OCR processing
- **CloudWatch**: Logging and monitoring

---

## Cost Breakdown by Service

### 1. ECS Fargate (Compute)
**Current**: 1 task @ 0.25 vCPU, 0.5 GB RAM (24/7)

**Pricing** (us-east-1):
- vCPU: $0.04048 per vCPU per hour
- Memory: $0.004445 per GB per hour

**Monthly Cost**:
- vCPU: 0.25 × $0.04048 × 730 hours = **$7.39/month**
- Memory: 0.5 × $0.004445 × 730 hours = **$1.62/month**
- **Total ECS**: **$9.01/month** per task

**Scaling Estimates**:
- 100 users: 1 task = **$9/month**
- 1,000 users: 2 tasks = **$18/month**
- 10,000 users: 5 tasks = **$45/month**
- 100,000 users: 15 tasks = **$135/month**

---

### 2. Application Load Balancer
**Pricing**:
- Load Balancer hours: $0.0225 per hour
- LCU (Load Balancer Capacity Unit): $0.008 per LCU-hour

**Monthly Cost**:
- ALB hours: $0.0225 × 730 = **$16.43/month**
- LCUs (estimated 1-2 LCUs for small traffic): **$6-12/month**
- **Total ALB**: **$22-28/month** (flat, doesn't scale much)

---

### 3. DynamoDB
**Current**: On-Demand pricing

**Pricing**:
- Write requests: $1.25 per million writes
- Read requests: $0.25 per million reads
- Storage: $0.25 per GB-month

**Usage Estimates** (per user per month):
- 20 workouts saved = 20 writes
- 100 workout views = 100 reads
- 50 KB per workout × 20 = 1 MB storage

**Monthly Cost by Scale**:
- **100 users**: 2K writes ($0.003) + 10K reads ($0.003) + 0.1 GB storage ($0.03) = **$0.04/month**
- **1,000 users**: 20K writes ($0.03) + 100K reads ($0.03) + 1 GB storage ($0.25) = **$0.31/month**
- **10,000 users**: 200K writes ($0.25) + 1M reads ($0.25) + 10 GB storage ($2.50) = **$3.00/month**
- **100,000 users**: 2M writes ($2.50) + 10M reads ($2.50) + 100 GB storage ($25) = **$30/month**

---

### 4. AWS Cognito
**Pricing**:
- First 50,000 MAU (Monthly Active Users): **FREE**
- 50,001-100,000 MAU: $0.0055 per MAU
- 100,001-1,000,000 MAU: $0.0046 per MAU

**Monthly Cost**:
- **0-50K users**: **$0/month** (FREE)
- **100K users**: 50K × $0.0055 = **$275/month**
- **1M users**: 50K × $0.0055 + 950K × $0.0046 = **$4,645/month**

---

### 5. S3 Storage (Workout Images)
**Pricing**:
- Storage: $0.023 per GB-month (Standard)
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Usage Estimates** (per user per month):
- 5 workouts with images = 5 uploads (200 KB each) = 1 MB
- 50 image views = 50 downloads

**Monthly Cost by Scale**:
- **100 users**: 0.1 GB storage ($0.002) + requests ($0.001) = **$0.003/month**
- **1,000 users**: 1 GB storage ($0.023) + requests ($0.01) = **$0.03/month**
- **10,000 users**: 10 GB storage ($0.23) + requests ($0.10) = **$0.33/month**
- **100,000 users**: 100 GB storage ($2.30) + requests ($1.00) = **$3.30/month**

---

### 6. AWS Textract (OCR)
**Pricing**:
- DetectDocumentText: $1.50 per 1,000 pages
- AnalyzeDocument: $50.00 per 1,000 pages (Tables/Forms)

**Usage Estimates**:
- Free tier: 2 OCR/user/week = 8 OCR/month
- Paid tier: Unlimited OCR = 20 OCR/month (average)

**Monthly Cost by Scale**:
- **100 users (50% free, 50% paid)**: 400 free + 1,000 paid = 1.4K pages × $1.50 = **$2.10/month**
- **1,000 users (70% free, 30% paid)**: 5.6K free + 6K paid = 11.6K pages × $1.50 = **$17.40/month**
- **10,000 users (80% free, 20% paid)**: 64K free + 40K paid = 104K pages × $1.50 = **$156/month**
- **100,000 users (85% free, 15% paid)**: 680K free + 300K paid = 980K pages × $1.50 = **$1,470/month**

---

### 7. Route53 (DNS)
**Pricing**:
- Hosted zone: $0.50 per hosted zone per month
- Queries: $0.40 per million queries (first 1B)

**Monthly Cost**:
- Hosted zone: **$0.50/month**
- Queries (estimated 1M-10M): **$0.40-4.00/month**
- **Total Route53**: **$1-5/month** (minimal scaling)

---

### 8. ECR (Docker Registry)
**Pricing**:
- Storage: $0.10 per GB-month
- Data transfer: $0.09 per GB (out to internet)

**Usage**:
- 1 Docker image (~856 MB) = 0.86 GB
- Minimal data transfer (only on deployments)

**Monthly Cost**: **$0.10-0.50/month**

---

### 9. CloudWatch Logs & Monitoring
**Pricing**:
- Log ingestion: $0.50 per GB
- Log storage: $0.03 per GB-month
- Metrics: First 10 custom metrics free, then $0.30 per metric

**Usage Estimates**:
- 100 MB logs/day = 3 GB/month
- 20 custom metrics

**Monthly Cost**:
- Ingestion: 3 GB × $0.50 = **$1.50/month**
- Storage: 3 GB × $0.03 = **$0.09/month**
- Metrics: 10 × $0.30 = **$3.00/month**
- **Total CloudWatch**: **$5/month** (scales with traffic)

**Scaling**:
- **10K users**: **$20/month**
- **100K users**: **$100/month**

---

## Total Monthly AWS Costs

### Current (Beta - ~10 users)
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate | $9 |
| ALB | $25 |
| DynamoDB | $0.05 |
| Cognito | $0 (free tier) |
| S3 | $0.01 |
| Textract | $1 |
| Route53 | $1 |
| ECR | $0.50 |
| CloudWatch | $5 |
| **TOTAL** | **~$42/month** |

---

### Scaled Projections

#### 100 Users (Launch)
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate | $9 |
| ALB | $25 |
| DynamoDB | $0.50 |
| Cognito | $0 (free tier) |
| S3 | $0.10 |
| Textract | $3 |
| Route53 | $1 |
| ECR | $0.50 |
| CloudWatch | $5 |
| **TOTAL** | **~$44/month** |
| **Per User** | **$0.44/user/month** |

---

#### 1,000 Users
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate | $18 |
| ALB | $26 |
| DynamoDB | $5 |
| Cognito | $0 (free tier) |
| S3 | $1 |
| Textract | $25 |
| Route53 | $2 |
| ECR | $0.50 |
| CloudWatch | $10 |
| **TOTAL** | **~$88/month** |
| **Per User** | **$0.088/user/month** |

---

#### 10,000 Users
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate | $45 |
| ALB | $28 |
| DynamoDB | $50 |
| Cognito | $0 (free tier) |
| S3 | $5 |
| Textract | $200 |
| Route53 | $3 |
| ECR | $0.50 |
| CloudWatch | $50 |
| **TOTAL** | **~$382/month** |
| **Per User** | **$0.038/user/month** |

---

#### 100,000 Users
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate | $135 |
| ALB | $35 |
| DynamoDB | $300 |
| Cognito | $275 |
| S3 | $50 |
| Textract | $1,800 |
| Route53 | $5 |
| ECR | $0.50 |
| CloudWatch | $200 |
| **TOTAL** | **~$2,801/month** |
| **Per User** | **$0.028/user/month** |

---

## Revenue Analysis

### Subscription Tiers (from ROADMAP.md)

| Tier | Price | OCR Quota | Crew Limit | Features |
|------|-------|-----------|------------|----------|
| **Free** | $0/month | 2/week (8/month) | 5 members | Basic tracking |
| **Starter** | $4.99/month | 10/week (40/month) | 20 members | Analytics |
| **Pro** | $9.99/month | Unlimited | Unlimited | AI insights |
| **Elite** | $19.99/month | Unlimited | Unlimited | Custom programming |

### User Distribution Assumptions
Based on typical freemium conversion rates:

| Tier | % of Users | Conversion Rate |
|------|-----------|----------------|
| Free | 85% | - |
| Starter | 8% | 8% of total |
| Pro | 5% | 5% of total |
| Elite | 2% | 2% of total |

---

## Profitability Analysis

### Revenue Projections by Scale

#### 100 Users
- Free: 85 users × $0 = **$0**
- Starter: 8 users × $4.99 = **$40**
- Pro: 5 users × $9.99 = **$50**
- Elite: 2 users × $19.99 = **$40**
- **Total Revenue**: **$130/month**
- **AWS Costs**: **$44/month**
- **Profit**: **$86/month** ✅
- **Margin**: **66%**

---

#### 1,000 Users
- Free: 850 users × $0 = **$0**
- Starter: 80 users × $4.99 = **$399**
- Pro: 50 users × $9.99 = **$500**
- Elite: 20 users × $19.99 = **$400**
- **Total Revenue**: **$1,299/month**
- **AWS Costs**: **$88/month**
- **Profit**: **$1,211/month** ✅
- **Margin**: **93%**

---

#### 10,000 Users
- Free: 8,500 users × $0 = **$0**
- Starter: 800 users × $4.99 = **$3,992**
- Pro: 500 users × $9.99 = **$4,995**
- Elite: 200 users × $19.99 = **$3,998**
- **Total Revenue**: **$12,985/month**
- **AWS Costs**: **$382/month**
- **Profit**: **$12,603/month** ✅
- **Margin**: **97%**

---

#### 100,000 Users
- Free: 85,000 users × $0 = **$0**
- Starter: 8,000 users × $4.99 = **$39,920**
- Pro: 5,000 users × $9.99 = **$49,950**
- Elite: 2,000 users × $19.99 = **$39,980**
- **Total Revenue**: **$129,850/month**
- **AWS Costs**: **$2,801/month**
- **Profit**: **$127,049/month** ✅
- **Margin**: **98%**

---

## Break-Even Analysis

### Break-Even Point
With conservative 10% conversion rate (to paid tiers):

**Fixed Costs** (monthly):
- AWS base infrastructure: ~$44/month
- Domain/SSL: ~$1/month
- **Total Fixed**: ~$45/month

**Variable Cost per User**:
- Scales down from $0.44/user (100 users) to $0.028/user (100K users)

**Average Revenue per User (ARPU)**:
- Free tier: $0
- Paid tiers (15% of users): Average $8/month
- **ARPU across all users**: $1.20/month

**Break-Even Users**: ~45 users (or ~7 paying customers)

✅ **Currently profitable at 100+ users**

---

## Key Profitability Metrics

### 1. Customer Acquisition Cost (CAC)
**Assumed CAC**: $10-20 per user (via social media ads, influencer partnerships)

**CAC Payback Period**:
- Free users: Never (rely on word-of-mouth)
- Starter ($4.99/month): 2-4 months
- Pro ($9.99/month): 1-2 months
- Elite ($19.99/month): <1 month

---

### 2. Lifetime Value (LTV)
**Assumptions**:
- Average subscription length: 12 months
- Churn rate: 10% per month (typical for fitness apps)

**LTV Calculation**:
- Starter: $4.99 × 12 months = **$59.88**
- Pro: $9.99 × 12 months = **$119.88**
- Elite: $19.99 × 12 months = **$239.88**

**LTV:CAC Ratio**:
- Starter: $59.88 / $15 = **4:1** ✅ (healthy)
- Pro: $119.88 / $15 = **8:1** ✅ (excellent)
- Elite: $239.88 / $15 = **16:1** ✅ (exceptional)

---

### 3. Unit Economics
At 10,000 users with 15% conversion:

**Revenue**:
- 1,500 paying users × $8 avg = **$12,000/month**

**Costs**:
- AWS: **$382/month**
- CAC amortized: $15 × 1,500 / 12 months = **$1,875/month**
- **Total Costs**: **$2,257/month**

**Profit**: **$9,743/month** ✅
**Margin**: **81%**

---

## Cost Optimization Strategies

### 1. Reserved Capacity (Fargate Savings Plans)
- **1-year commitment**: 20% discount
- **3-year commitment**: 50% discount
- **Potential Savings**: $5-10/month initially, $50-100/month at scale

### 2. DynamoDB Reserved Capacity
- Switch from On-Demand to Provisioned at 10K+ users
- **Potential Savings**: 30-50% on DynamoDB costs
- Savings: $15-25/month at 10K users, $100-150/month at 100K users

### 3. S3 Intelligent-Tiering
- Automatically move rarely accessed images to cheaper storage
- **Potential Savings**: 20-30% on S3 costs
- Minimal savings initially, $10-15/month at 100K users

### 4. CloudFront CDN
- Reduce ALB data transfer costs
- Improve global performance
- **Cost**: +$10-20/month, but reduces other costs by similar amount

### 5. Compress Docker Images
- Current: 856 MB
- Target: <500 MB (multi-stage builds, Alpine)
- **Savings**: Faster deployments, lower ECR costs

### 6. Batch Textract Requests
- Process multiple OCR requests in parallel
- Reduce API call overhead
- **Savings**: 5-10% on Textract costs

---

## Risk Factors

### 1. OCR Costs Scale Linearly
**Risk**: Textract becomes largest cost at scale ($1,800/month at 100K users)
**Mitigation**:
- Implement strict quota enforcement
- Encourage upgrades to paid tiers
- Consider alternative OCR solutions (Tesseract.js for simple cases)
- Cache OCR results for duplicate images

### 2. Cognito Costs Spike After 50K MAU
**Risk**: Cognito goes from $0 to $275/month at 100K users
**Mitigation**:
- Already using Google OAuth federated identity (cheaper)
- Could migrate to self-hosted authentication (NextAuth + DB)
- Break-even well below 50K users, so cost is acceptable

### 3. Payment Processing Fees
**Not included in analysis above!**

**Stripe Fees**:
- 2.9% + $0.30 per transaction
- For $9.99 subscription: $0.29 + $0.30 = **$0.59 fee** (5.9%)

**Adjusted Profit Margins**:
- 1,000 users: $1,299 revenue - $88 AWS - $77 Stripe = **$1,134 profit** (87% margin)
- 10,000 users: $12,985 revenue - $382 AWS - $767 Stripe = **$11,836 profit** (91% margin)
- 100,000 users: $129,850 revenue - $2,801 AWS - $7,661 Stripe = **$119,388 profit** (92% margin)

✅ **Still highly profitable even with payment fees**

---

## Conclusion

### ✅ **The app WILL be profitable at scale**

**Key Findings**:

1. **Break-even at ~45 users** (7 paying customers)
2. **High profit margins**: 66% at 100 users → 92% at 100K users
3. **Low variable costs**: $0.44/user → $0.028/user (economy of scale)
4. **Sustainable unit economics**: LTV:CAC ratios of 4:1 to 16:1
5. **Minimal fixed costs**: Only $45/month base infrastructure

**Profitability by Scale**:
- 100 users: **$86/month profit** (66% margin)
- 1,000 users: **$1,134/month profit** (87% margin)
- 10,000 users: **$11,836/month profit** (91% margin)
- 100,000 users: **$119,388/month profit** (92% margin)

**Annual Profit Projections**:
- 10,000 users: **$142,032/year**
- 100,000 users: **$1,432,656/year**

### Biggest Cost Drivers at Scale:
1. **AWS Textract OCR**: $1,800/month at 100K users (64% of AWS costs)
2. **Cognito Authentication**: $275/month at 100K users (10% of AWS costs)
3. **DynamoDB**: $300/month at 100K users (11% of AWS costs)

### Recommendations:
1. ✅ Proceed with current pricing model ($4.99, $9.99, $19.99)
2. ✅ Focus on user acquisition - margins support high CAC
3. ⚠️ Monitor OCR usage closely - implement quota enforcement strictly
4. ⚠️ Consider Reserved Capacity at 1,000+ users for 20-50% savings
5. ✅ Stripe fees acceptable given high margins

**Bottom Line**: This business model is extremely profitable and scalable. AWS costs grow slower than revenue, resulting in improving margins at scale. The app can easily support $10-20 CAC and still maintain 80%+ profit margins.
