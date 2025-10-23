# Spot Buddy - Master Feature List

**Last Updated**: January 2025
**Current Version**: v1.5 (MVP Complete)

This document contains a comprehensive list of all planned features, organized by phase and priority.

---

## ✅ Completed Features (v1.0 - v1.5)

### Phase 1: Core Workout Persistence
- [x] AWS Cognito authentication with Google OAuth
- [x] DynamoDB workout storage with cross-device sync
- [x] Workout CRUD operations (Create, Read, Update, Delete)
- [x] API routes for workout management
- [x] Instagram workout parser
- [x] OCR image processing (Tesseract.js)
- [x] Dark theme UI with shadcn/ui components
- [x] Mobile responsive design
- [x] Docker containerization
- [x] AWS ECS Fargate deployment with HTTPS

### Phase 2: Calendar & Scheduling
- [x] Calendar view with workout indicators
- [x] Schedule workouts for future dates
- [x] Mark workouts as completed
- [x] Visual indicators (scheduled = hollow ring, completed = filled dot)
- [x] Last 24 hours workout section
- [x] Recent activity feed with completed workouts
- [x] Schedule workout modal with two-step workflow

### Phase 3: Smart Workout Timers
- [x] Interval timer with circular progress
- [x] HIIT timer with work/rest phases
- [x] Rest timer floating widget
- [x] Timer presets (Tabata, EMOM, etc.)
- [x] Web Audio API beeps
- [x] Web Notifications
- [x] LocalStorage persistence
- [x] Timer page at `/timer`

### Phase 4: Enhanced Stats & PRs Tracking
- [x] Personal records (PRs) automatic detection
- [x] 7 different 1RM calculation formulas
- [x] PR progression charts per exercise
- [x] Exercise history and volume tracking
- [x] Body metrics tracking (weight, body fat %, 8 measurements)
- [x] Body metrics API endpoints
- [x] Stats pages (`/stats/prs`, `/stats/metrics`)
- [x] Measurement history timeline with charts

### Phase 5: Subscription & Monetization
- [x] Stripe payment integration
- [x] Four subscription tiers (Free, Starter, Pro, Elite)
- [x] Feature gating by subscription level
- [x] OCR quota enforcement
- [x] Subscription management UI
- [x] Stripe webhook handlers
- [x] Billing portal integration
- [x] Usage tracking and limits

---

## 📋 Planned Features (v1.6+)

### Phase 6: AI-Powered Features (High Priority - Q1 2025)

#### 6.1 Smart Workout Parser & Enhancement
- [ ] **"Enhance with AI" button** after OCR/Instagram parsing
  - Clean up messy OCR text
  - Standardize exercise names
  - Add missing exercise details
  - Suggest weight recommendations based on user PRs
  - Add form cues and tips
  - Suggest exercise substitutions
  - Estimate workout duration and difficulty
  - Recommend rest periods
- [ ] **Two-button workflow**: "Save As Is" or "✨ Enhance with AI"
- [ ] **AI context from user data**:
  - PR history from workouts
  - Body metrics
  - User profile preferences
  - Exercise history and frequency
- [ ] **Token/quota tracking**:
  - Free: 0 AI requests/month
  - Starter: 5 AI requests/month
  - Pro: 50 AI requests/month
  - Elite: Unlimited

**Files to Create**:
- `src/lib/ai/bedrock-client.ts`
- `src/lib/ai/workout-enhancer.ts`
- `src/app/api/ai/enhance-workout/route.ts`
- `src/components/ai/enhance-button.tsx`

**Estimated Time**: 6-8 hours

---

#### 6.2 User Training Profile & Preferences
- [ ] **New Settings section**: "Training Profile"
- [ ] **Manual PR entry** for exercises not tracked:
  - Bench Press 1RM
  - Squat 1RM
  - Deadlift 1RM
  - Overhead Press 1RM
  - Custom exercises
- [ ] **Training goals** (multi-select):
  - Strength gain
  - Muscle building (hypertrophy)
  - Fat loss
  - Endurance
  - Athletic performance
  - General fitness
  - Rehabilitation/Recovery
- [ ] **Workout preferences**:
  - Favorite exercises (autocomplete multi-select)
  - Disliked exercises
  - Available equipment (gym, home gym, minimal)
  - Preferred workout duration (30/45/60/90 min)
  - Training frequency (days per week)
  - Experience level (beginner, intermediate, advanced)
- [ ] **Training focus**: What are you training for?
  - Bodybuilding competition
  - Powerlifting meet
  - CrossFit competition
  - Marathon/endurance event
  - Weight loss goal
  - General health
  - Sport-specific training
- [ ] **Constraints & limitations**:
  - Injuries or limitations (text field)
  - Time constraints
  - Energy levels (morning/evening person)

**DynamoDB Schema Update**:
```typescript
// Add to spotter-users table
trainingProfile: {
  manualPRs, goals, favoriteExercises, dislikedExercises,
  equipment, preferredDuration, trainingFrequency,
  experienceLevel, trainingFocus, constraints, energyLevels
}
```

**Files to Create**:
- `src/app/settings/training-profile/page.tsx`
- `src/lib/ai/profile-context.ts`
- `src/app/api/user/profile/route.ts`

**Estimated Time**: 4-6 hours

---

#### 6.3 AI Workout Generator
- [ ] **"Generate Workout" feature** for paid users
- [ ] **Free-text prompt input**:
  - Example: "Upper body strength with dumbbells, 45 minutes"
  - Example: "Full body HIIT workout for fat loss"
  - Example: "Leg day focusing on quads"
- [ ] **Duration selector**: 30/45/60/90 minutes
- [ ] **Difficulty slider**: beginner/intermediate/advanced
- [ ] **AI processing**:
  - Analyze user's training profile
  - Review recent workout history
  - Check user's PRs for weight recommendations
  - Search online for exercise variations
  - Generate complete workout with warm-up, main exercises, cool-down
- [ ] **Output format**: Editable workout with form cues and tips
- [ ] **"Regenerate" button** for variations
- [ ] **Feature gating**:
  - Free: No access (upgrade prompt)
  - Starter: 5 AI-generated workouts/month
  - Pro: 50 AI-generated workouts/month
  - Elite: Unlimited

**Files to Create**:
- `src/app/add/generate/page.tsx`
- `src/lib/ai/workout-generator.ts`
- `src/app/api/ai/generate-workout/route.ts`
- `src/components/ai/workout-generator-form.tsx`

**Estimated Time**: 8-10 hours

---

#### 6.4 Workout of the Day (WOD)
- [ ] **Daily workout suggestion** on home page/dashboard
- [ ] **Three duration options**: 30 min, 45 min, 60 min
- [ ] **For all users**: Generic WOD (same for everyone)
- [ ] **For paid users** (Pro/Elite): Personalized WOD
  - Based on training profile
  - Adapts to recent workout history
  - Uses user's PRs for recommendations
  - Considers goals and preferences
- [ ] **Reset at midnight UTC** daily
- [ ] **"Coming Soon" banner** for free users about personalization

**Generation Strategy**:
- **Option 1 (Preferred)**: n8n automation
  - n8n workflow runs daily at midnight UTC
  - Generates WOD using Claude/GPT-4
  - Stores in DynamoDB table: `spotter-wod`
  - Frontend fetches pre-generated WOD
- **Option 2**: On-demand generation
  - API endpoint generates on request
  - Caches for 24 hours
  - Regenerates after midnight

**New DynamoDB Table**: `spotter-wod`
```typescript
{
  date: string          // Partition key (YYYY-MM-DD)
  duration: number      // Sort key (30, 45, 60)
  workout: {...}
  createdAt: string
  expiresAt: number     // TTL for auto-deletion
}
```

**Files to Create**:
- `src/components/wod/workout-of-day.tsx`
- `src/app/api/wod/route.ts`
- `src/lib/ai/wod-generator.ts`

**Estimated Time**: 6-8 hours

---

### Phase 7: AI Trainer / Coach (Future - Q2/Q3 2025)

**Elite Tier Feature**

#### 7.1 AI Coach Daily Check-ins
- [ ] **Morning check-in**: "Good morning! Ready for today's workout?"
- [ ] **Evening check-in**: "Did you complete your workout today?"
- [ ] **Personalized daily WOD** based on:
  - Training profile
  - Recovery needs
  - User's schedule
- [ ] **Push notifications** via Amazon SNS

#### 7.2 Nutrition & Recovery Guidance
- [ ] **Macros recommendations**
- [ ] **Meal timing suggestions**
- [ ] **Hydration reminders**
- [ ] **Rest day recommendations**
- [ ] **Sleep tracking integration** (future)
- [ ] **Fatigue monitoring**

#### 7.3 Progress Tracking & Motivation
- [ ] **Weekly workout summary**
- [ ] **PR congratulations**
- [ ] **Encouragement during plateaus**
- [ ] **Milestone celebrations**

#### 7.4 Conversational AI Interface
- [ ] **Chat interface** with AI coach
- [ ] **Ask questions** about form, technique, nutrition
- [ ] **Voice-activated logging** (future)

**Files to Create**:
- `src/lib/ai/coach.ts`
- `src/lib/notifications/push-service.ts`
- `src/app/api/coach/route.ts`
- `src/components/coach/chat-interface.tsx`

**Technologies**:
- Amazon SNS (push notifications)
- Amazon Bedrock (conversational AI)
- DynamoDB (conversation history)
- EventBridge (scheduled check-ins)

**Estimated Time**: 20-30 hours

---

### Phase 8: Social & Crew Features (Q2 2025)

#### 8.1 Crew System (Friends)
- [ ] **Friend request system** (send, accept, decline)
- [ ] **Crew list UI** showing friends
- [ ] **Real-time activity feed** for crew members
- [ ] **DynamoDB table**: `spotter-crews`

#### 8.2 Workout Completion Alerts
- [ ] **Notifications** when crew members complete workouts
- [ ] **Workout summary** in notification (exercises, volume, PRs)
- [ ] **Notification preferences** (email, push, in-app)
- [ ] **Daily digest option** (batched notifications)

#### 8.3 Social Interactions
- [ ] **"Quip" reply system** (funny comments on workouts)
- [ ] **Emoji reactions** (🔥 💪 👏 🎉)
- [ ] **Quip history** on workout detail pages
- [ ] **Trending quips** among crew

#### 8.4 Crew Leaderboards
- [ ] **Weekly workout count** leaderboard
- [ ] **Monthly volume** leaderboard
- [ ] **Streak competition** tracking
- [ ] **PR count leaderboard** (most PRs this month)

#### 8.5 Crew Challenges (Future)
- [ ] **Create crew-specific challenges**
- [ ] **Set crew goals** (e.g., "1000 total reps this week")
- [ ] **Challenge progress tracking**
- [ ] **Challenge rewards/badges**

**Estimated Time**: 15-20 hours

---

### Phase 9: Advanced Calendar Features (Q2 2025)

#### 9.1 Calendar Enhancements
- [ ] **Drag-and-drop workout scheduling**
- [ ] **DynamoDB GSI** for optimized date range queries
- [ ] **Month/week/day views** (currently month only)
- [ ] **Workout heatmap** for visual consistency
- [ ] **Calendar export** (ICS format)

#### 9.2 Workout Reminders
- [ ] **Amazon SNS integration** for email/SMS reminders
- [ ] **Reminder preferences** (1 hour before, day before, etc.)
- [ ] **Snooze functionality**
- [ ] **Reminder notification sound**

**Estimated Time**: 8-10 hours

---

### Phase 10: Enhanced OCR & Parsing (Q3 2025)

#### 10.1 AWS Textract Integration (Production)
- [ ] **Replace Tesseract.js** with AWS Textract for better accuracy
- [ ] **Handwriting recognition**
- [ ] **Multi-language support** (Spanish, French, German)
- [ ] **Table detection** for complex workout layouts

#### 10.2 Instagram Parser Improvements
- [ ] **Test various workout formats**
- [ ] **Support more caption formats**
- [ ] **Improved exercise name recognition**
- [ ] **Image carousel support** for multi-image posts
- [ ] **Video parsing** (extract workout from video captions)

#### 10.3 Smart Parsing Features
- [ ] **Auto-detect workout type** (strength, cardio, HIIT)
- [ ] **Extract difficulty level**
- [ ] **Identify target muscle groups**
- [ ] **Parse rest periods** from text

**Estimated Time**: 10-12 hours

---

### Phase 11: Workout Sharing (Q3 2025)

#### 11.1 Public Workout Links
- [ ] **Generate shareable workout links**
- [ ] **Public workout view page** (no auth required)
- [ ] **Social media meta tags** (Open Graph, Twitter Cards)
- [ ] **"Share to Instagram/Twitter" functionality**
- [ ] **QR code generation** for workouts

#### 11.2 Embed Features
- [ ] **Embeddable workout widgets**
- [ ] **Copy-to-clipboard** for sharing
- [ ] **Workout templates marketplace** (future)

**Estimated Time**: 6-8 hours

---

### Phase 12: Performance & Optimization (Ongoing)

#### 12.1 Performance
- [ ] **Redis caching** for frequently accessed data
- [ ] **CloudFront CDN** for static assets
- [ ] **Image optimization** with Next.js Image component
- [ ] **Lazy loading** for workout lists
- [ ] **Service worker** for offline support
- [ ] **Skeleton loaders** for better perceived performance

#### 12.2 Monitoring & Observability
- [ ] **CloudWatch dashboards** for ECS/ALB metrics
- [ ] **Structured logging** (already implemented)
- [ ] **Error tracking** (Sentry or similar)
- [ ] **Uptime monitoring** (Pingdom/UptimeRobot)
- [ ] **Alerting for critical errors**
- [ ] **Performance metrics** (Core Web Vitals)

#### 12.3 Security Hardening
- [ ] **Rate limiting** on API routes
- [ ] **CSRF protection**
- [ ] **WAF on ALB** for DDoS protection
- [ ] **Content Security Policy (CSP)**
- [ ] **Security headers** (HSTS, X-Frame-Options)
- [ ] **Regular dependency audits**
- [ ] **Penetration testing**

#### 12.4 Backup & Disaster Recovery
- [ ] **DynamoDB point-in-time recovery**
- [ ] **Automated backups**
- [ ] **Disaster recovery runbook**
- [ ] **Backup restoration testing**

**Estimated Time**: Ongoing

---

### Phase 13: Testing & Quality (Q3 2025)

#### 13.1 Automated Testing
- [ ] **Unit tests** (Jest + React Testing Library)
- [ ] **E2E tests** (Playwright)
- [ ] **API integration tests**
- [ ] **Visual regression tests** (Percy or Chromatic)

#### 13.2 CI/CD Pipeline
- [ ] **GitHub Actions** workflow
- [ ] **Automated testing** on PR
- [ ] **Automated deployments** to staging
- [ ] **Manual approval** for production
- [ ] **Rollback strategy**

#### 13.3 Code Quality
- [ ] **Remove TypeScript build workarounds**
- [ ] **Enable strict TypeScript mode fully**
- [ ] **Add comprehensive error logging**
- [ ] **Add input validation** with Zod schemas
- [ ] **Code coverage targets** (80%+)

**Estimated Time**: 15-20 hours

---

### Phase 14: Mobile App (Q4 2025 / 2026)

#### 14.1 React Native App Development
- [ ] **Evaluate React Native vs Flutter**
- [ ] **Share authentication** with web app (Cognito)
- [ ] **Offline-first architecture**
- [ ] **Native camera integration** for workout photos
- [ ] **Biometric authentication** (Face ID, Touch ID)

#### 14.2 iOS HealthKit Integration
- [ ] **Request HealthKit permissions**
- [ ] **Sync workout data to Apple Health**
- [ ] **Import body metrics** (weight, body fat %, heart rate)
- [ ] **Export workout sessions** with duration, calories
- [ ] **Two-way sync**: read health data, write workout data

#### 14.3 Android Health Connect Integration
- [ ] **Request Health Connect permissions**
- [ ] **Sync workout data** to Google Fit / Samsung Health
- [ ] **Import body metrics**
- [ ] **Export workout sessions** with detailed exercise data
- [ ] **Two-way sync** with Health Connect API

#### 14.4 App Store Deployment
- [ ] **Apple App Store** setup and submission
- [ ] **Google Play Store** setup and submission
- [ ] **In-app purchase handling**
- [ ] **Push notifications** (FCM/APNs)

**Estimated Time**: 12-16 weeks

---

### Phase 15: Marketplace & Content (2026)

#### 15.1 Workout Templates Marketplace
- [ ] **In-app purchase** of workout plans ($9.99 - $49.99)
- [ ] **Coach-created programs** (custom pricing)
- [ ] **Exercise library** with videos
- [ ] **Workout templates** marketplace
- [ ] **Paid creator subscriptions**
- [ ] **Revenue sharing** with coaches

#### 15.2 Coach & Enterprise Features
- [ ] **Coach dashboard**
- [ ] **Client management**
- [ ] **Workout assignment system**
- [ ] **Progress monitoring** for clients
- [ ] **Custom branding** for coaches
- [ ] **Team/gym organization accounts**
- [ ] **Coach subscriptions** ($49/month)
- [ ] **Gym/team accounts** ($199/month)
- [ ] **White-label solutions** (custom pricing)

**Estimated Time**: 20-30 weeks

---

### Phase 16: Platform Enhancements (2026+)

#### 16.1 General Improvements
- [ ] **Multi-language support** (Spanish, French, German, Portuguese)
- [ ] **Accessibility improvements** (WCAG compliance)
- [ ] **Dark/light theme toggle** (currently dark only)
- [ ] **Advanced search** with filters
- [ ] **Workout import/export** (CSV, JSON)
- [ ] **Third-party API** for integrations

#### 16.2 Additional Integrations
- [ ] **Facebook login** (federated identity)
- [ ] **Apple Sign-In** (federated identity)
- [ ] **Fitbit integration**
- [ ] **Strava integration**
- [ ] **Garmin integration**
- [ ] **Barcode scanner** for supplements/nutrition
- [ ] **Smart gym equipment integration**

#### 16.3 Developer Experience
- [ ] **Storybook** for component documentation
- [ ] **API documentation** (OpenAPI/Swagger)
- [ ] **Pre-commit hooks** (Husky + lint-staged)
- [ ] **Design system documentation**

**Estimated Time**: Ongoing

---

## 🎯 Quick Wins (Can be done anytime)

These are small improvements that provide immediate value:

1. [ ] **Workout quick-add shortcuts** (15 min)
2. [ ] **Improve mobile navigation UX** (30 min)
3. [ ] **Keyboard shortcuts** for power users (1 hour)
4. [ ] **Privacy policy** and terms of service pages (2 hours)
5. [ ] **User feedback widget** (30 min)
6. [ ] **Workout search and filters** in library (2 hours)
7. [ ] **Exercise video links** (link to YouTube) (1 hour)
8. [ ] **Print workout view** (1 hour)
9. [ ] **Workout duplicate** feature (30 min)
10. [ ] **Bulk workout actions** (delete, tag) (2 hours)

---

## 📊 Feature Priority Matrix

| Priority | Features | Timeline |
|----------|----------|----------|
| **P0 (Critical)** | ✅ All Phase 1-5 features complete | Done |
| **P1 (High)** | Phase 6: AI Features | Q1 2025 |
| **P2 (Medium)** | Phase 7: AI Coach, Phase 8: Social | Q2 2025 |
| **P3 (Low)** | Phase 9-13: Polish & Optimization | Q3 2025 |
| **P4 (Future)** | Phase 14-16: Mobile & Enterprise | 2026+ |

---

## 💰 Subscription Tier Feature Matrix

| Feature | Free | Starter ($4.99) | Pro ($9.99) | Elite ($19.99) |
|---------|------|-----------------|-------------|----------------|
| **Core Features** |
| Workout tracking | ✅ 50 max | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| OCR scans | ✅ 2/week | ✅ 10/week | ✅ Unlimited | ✅ Unlimited |
| Calendar view | ✅ | ✅ | ✅ | ✅ |
| Basic timers | ✅ | ✅ | ✅ | ✅ |
| Stats & PRs | ✅ Basic | ✅ | ✅ | ✅ |
| Body metrics | ✅ Basic | ✅ | ✅ | ✅ |
| **AI Features (Phase 6)** |
| AI workout enhancement | ❌ | ✅ 5/month | ✅ 50/month | ✅ Unlimited |
| AI workout generator | ❌ | ✅ 5/month | ✅ 50/month | ✅ Unlimited |
| Training profile | ✅ | ✅ | ✅ | ✅ |
| Workout of the Day | ✅ Generic | ✅ Generic | ✅ Personalized | ✅ Personalized |
| **Advanced Features** |
| Advanced analytics | ❌ | ✅ | ✅ | ✅ |
| Progress photos | ❌ | ❌ | ✅ | ✅ |
| Export data | ❌ | ❌ | ✅ | ✅ |
| **Social Features (Phase 8)** |
| Crew members | ❌ | ❌ | ❌ | ✅ |
| Social leaderboards | ❌ | ❌ | ❌ | ✅ |
| Crew challenges | ❌ | ❌ | ❌ | ✅ |
| **AI Coach (Phase 7)** |
| AI trainer/coach | ❌ | ❌ | ❌ | ✅ |
| Daily check-ins | ❌ | ❌ | ❌ | ✅ |
| Nutrition guidance | ❌ | ❌ | ❌ | ✅ |
| **Support** |
| Support | Community | Email | Email | Priority |
| Early access | ❌ | ❌ | ❌ | ✅ |

---

## 🎓 Next Immediate Steps

### Week 1-2: Phase 6.1 & 6.2
1. Set up Amazon Bedrock / OpenAI client
2. Implement Smart Workout Parser
3. Add "Enhance with AI" button to `/add` page
4. Create Training Profile UI and API
5. Deploy as v1.6

### Week 3-4: Phase 6.3
1. Build AI Workout Generator
2. Create generation UI at `/add/generate`
3. Implement quota tracking
4. Deploy as v1.7

### Week 5-6: Phase 6.4
1. Build Workout of the Day component
2. Set up n8n automation workflow
3. Create WOD DynamoDB table
4. Deploy as v1.8

### After Phase 6 Complete
- Gather user feedback
- Monitor AI costs and usage
- Adjust quotas and pricing if needed
- Begin planning Phase 7 (AI Coach) or Phase 8 (Social)

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Current Status**: Phase 5 Complete, Phase 6 Planning
**Next Milestone**: Phase 6.1 - Smart Workout Parser
