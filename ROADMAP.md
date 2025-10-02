# Spotter Development Roadmap

## Current Status ✅
- **Production Deployment**: Live at https://spotter.cannashieldct.com
- **Authentication**: AWS Cognito with Google OAuth federated sign-in
- **User Management**: DynamoDB integration with automatic user sync
- **Infrastructure**: ECS Fargate, ALB with HTTPS, Route53 DNS
- **UI**: Dark theme with responsive design

---

## Phase 1: Core Data Persistence ✅
**Priority**: High | **Status**: Complete | **Completed**: October 2, 2025

### 1.1 Workout Data Model ✅
- [x] Design DynamoDB workout schema (partition key: userId, sort key: workoutId)
- [x] Add workout metadata fields: date, title, exercises, sets, reps, weights, notes
- [x] Implement workout CRUD operations in `src/lib/dynamodb.ts`
- [x] Add query methods (by date range, search, etc.)

### 1.2 Workout Sync to DynamoDB ✅
- [x] Update `/add/edit` page to save workouts to DynamoDB
- [x] Update `/library` page to load workouts from DynamoDB
- [x] Update `/workout/[id]` pages to fetch from DynamoDB
- [x] Add loading states and error handling
- [x] Implement localStorage cache as fallback

### 1.3 Cross-Device Sync ✅
- [x] Workouts save to DynamoDB with userId partition key
- [x] Cross-device access enabled (same userId = same workouts)
- [x] Graceful fallback to localStorage on errors
- [x] Ready for testing with multiple devices

### 1.4 API Routes ✅
- [x] Created `/api/workouts` (GET, POST)
- [x] Created `/api/workouts/[id]` (GET, PATCH, DELETE)
- [x] Authentication required for all operations

**Implementation Details**: See [PHASE-1-IMPLEMENTATION.md](PHASE-1-IMPLEMENTATION.md)

**Actual Time**: ~4 hours

---

## Phase 2: Instagram Integration Enhancement 📸
**Priority**: Medium | **Status**: Partially Complete

### 2.1 OCR Quota Management
- [ ] Implement OCR usage tracking in DynamoDB
- [ ] Add quota checks before OCR operations
- [ ] Display remaining quota to users in UI
- [ ] Implement weekly quota reset (currently placeholder)

### 2.2 Instagram Parser Improvements
- [ ] Test current Instagram parsing with various workout formats
- [ ] Add support for more workout caption formats
- [ ] Improve exercise name recognition
- [ ] Add image carousel support for multi-image posts

### 2.3 Upload Workflow
- [ ] Enhance `/add` page with drag-and-drop
- [ ] Add progress indicators for OCR processing
- [ ] Implement S3 upload for workout images
- [ ] Add image preview and edit before save

**Estimated Time**: 2-3 days

---

## Phase 3: Analytics & Progress Tracking 📊
**Priority**: Medium | **Status**: Not Started

### 3.1 Workout Statistics
- [ ] Calculate total workouts, exercises, volume over time
- [ ] Add charts for progress visualization (Chart.js or Recharts)
- [ ] Implement PR (Personal Record) tracking
- [ ] Add streak tracking (consecutive workout days)

### 3.2 Calendar Enhancements
- [ ] Load workout data into calendar view from DynamoDB
- [ ] Add click-to-view workout details in calendar
- [ ] Implement month/week/day views
- [ ] Add workout heatmap for visual consistency

### 3.3 Progress Dashboard
- [ ] Create dedicated dashboard page at `/dashboard`
- [ ] Display key metrics: total workouts, favorite exercises, volume trends
- [ ] Add goal setting and tracking
- [ ] Implement body weight tracking integration

**Estimated Time**: 3-4 days

---

## Phase 4: Subscription & Monetization 💳
**Priority**: Medium-Low | **Status**: Schema Ready

### 4.1 Stripe Integration
- [ ] Set up Stripe account and API keys
- [ ] Implement Stripe Checkout for subscription tiers
- [ ] Create subscription management page in `/settings`
- [ ] Add webhook handling for subscription events
- [ ] Update DynamoDB user records on subscription changes

### 4.2 Feature Gating
- [ ] Implement tier-based feature access (free: 2 OCR/week, pro: unlimited)
- [ ] Add paywall UI components
- [ ] Create upgrade prompts for premium features
- [ ] Implement billing portal for plan management

### 4.3 Subscription Tiers
- **Free**: 2 OCR/week, basic workout tracking
- **Starter** ($4.99/mo): 10 OCR/week, analytics
- **Pro** ($9.99/mo): Unlimited OCR, advanced analytics, AI insights
- **Elite** ($19.99/mo): All pro features + custom programming

**Estimated Time**: 4-5 days

---

## Phase 5: Social Features 👥
**Priority**: Low | **Status**: Not Started

### 5.1 Workout Sharing
- [ ] Generate shareable workout links
- [ ] Add public workout view page
- [ ] Implement social media meta tags (Open Graph, Twitter Cards)
- [ ] Add "Share to Instagram/Twitter" functionality

### 5.2 Community Features (Future)
- [ ] User profiles
- [ ] Follow/follower system
- [ ] Workout comments and reactions
- [ ] Leaderboards and challenges

**Estimated Time**: 5-7 days

---

## Phase 6: AI & Smart Features 🤖
**Priority**: Low | **Status**: Not Started

### 6.1 AI-Powered Insights
- [ ] Integrate OpenAI/Anthropic API for workout analysis
- [ ] Generate workout recommendations based on history
- [ ] Implement natural language workout input ("I did 3 sets of 10 bench press at 185lbs")
- [ ] Add form check suggestions using AI image analysis

### 6.2 Smart Notifications
- [ ] Implement push notifications (Web Push API)
- [ ] Send workout reminders based on user schedule
- [ ] Add progress milestone notifications
- [ ] Implement rest day recommendations

**Estimated Time**: 5-7 days

---

## Phase 7: Production Optimization 🚀
**Priority**: Ongoing | **Status**: Partially Complete

### 7.1 Performance
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add CDN for static assets (CloudFront)
- [ ] Optimize images with Next.js Image component
- [ ] Implement lazy loading for workout lists
- [ ] Add service worker for offline support

### 7.2 Monitoring & Observability
- [ ] Set up CloudWatch dashboards for ECS/ALB metrics
- [ ] Implement application logging (structured logs)
- [ ] Add error tracking (Sentry or similar)
- [ ] Set up uptime monitoring (Pingdom/UptimeRobot)
- [ ] Create alerting for critical errors

### 7.3 Security Hardening
- [ ] Implement rate limiting on API routes
- [ ] Add CSRF protection
- [ ] Enable WAF on ALB for DDoS protection
- [ ] Implement content security policy (CSP)
- [ ] Add security headers (HSTS, X-Frame-Options, etc.)
- [ ] Regular dependency updates and security audits

### 7.4 Backup & Disaster Recovery
- [ ] Enable DynamoDB point-in-time recovery
- [ ] Set up automated DynamoDB backups
- [ ] Create disaster recovery runbook
- [ ] Test backup restoration process

**Estimated Time**: Ongoing

---

## Phase 8: Mobile App (Future) 📱
**Priority**: Future | **Status**: Not Started

### 8.1 React Native App
- [ ] Evaluate React Native vs. Flutter
- [ ] Share authentication with web app (Cognito)
- [ ] Implement offline-first architecture
- [ ] Add native camera integration for workout photos
- [ ] Implement biometric authentication

### 8.2 App Store Deployment
- [ ] Apple App Store setup and submission
- [ ] Google Play Store setup and submission
- [ ] Add in-app purchase handling
- [ ] Implement push notifications (FCM/APNs)

**Estimated Time**: 8-12 weeks

---

## Backlog & Nice-to-Haves 💡

### Additional Features
- [ ] Facebook login (federated identity provider)
- [ ] Apple Sign-In (federated identity provider)
- [ ] Export workout data (CSV, PDF)
- [ ] Import from other fitness apps (Fitbit, Apple Health, Strava)
- [ ] Workout templates and programs
- [ ] Exercise video library
- [ ] Barcode scanner for supplements/nutrition
- [ ] Integration with smart gym equipment
- [ ] Workout buddy matching
- [ ] Virtual personal training sessions

### Developer Experience
- [ ] Add unit tests (Jest + React Testing Library)
- [ ] Add E2E tests (Playwright)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add pre-commit hooks (Husky + lint-staged)
- [ ] Create Storybook for component documentation
- [ ] Add API documentation (OpenAPI/Swagger)

---

## Quick Wins 🎯
These are small improvements that can be done quickly:

1. **Add workout quick-add shortcuts** (15 min)
2. **Improve mobile navigation UX** (30 min)
3. **Add keyboard shortcuts for power users** (1 hour)
4. **Implement dark/light mode toggle** (currently dark only) (1 hour)
5. **Add workout export to calendar (ICS)** (1 hour)
6. **Create privacy policy and terms of service pages** (2 hours)
7. **Add user feedback widget** (30 min)
8. **Implement workout search and filters** (2 hours)

---

## Immediate Next Steps

Based on current status, the recommended next phase is:

### **Phase 1: Core Data Persistence** (START HERE)
This is the foundation for all other features. Without workout data syncing to DynamoDB:
- Users can't access workouts across devices
- Data only exists in browser localStorage
- No analytics or progress tracking possible

**Action Items**:
1. Design workout DynamoDB schema
2. Implement workout CRUD operations
3. Update UI pages to use DynamoDB
4. Test cross-device sync

Once Phase 1 is complete, we can move to Phase 2 (Instagram Integration) or Phase 3 (Analytics) based on priorities.
