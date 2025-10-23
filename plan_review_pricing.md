# Spot Buddy - Subscription Pricing & Plan Completeness Review

**Date**: October 20, 2025
**Version**: 3.0
**Status**: Pre-Android Development

---

## Updated Subscription Pricing Structure

### Free Tier - $0

**Limits**:
- Maximum 15 total workouts saved
- 1 OCR scan per week (7-day rolling)
- 30-day workout history
- No AI features
- Ads displayed (mobile only)

**Included**:
- Instagram/TikTok share import
- Manual workout creation
- Basic exercise library (100 exercises)
- Basic stats
- Manual PR tracking
- CSV export

**Upgrade Prompts**:
- "You've reached your 15 workout limit. Upgrade to save unlimited workouts."
- "1 OCR scan remaining this week. Upgrade for unlimited scans."
- "Want to see all your workout history? Upgrade to Pro."

**Conversion Goal**: 5-7% → Starter

---

### Starter Tier - $7.99/month or $79.99/year (17% savings)

**Unlocked**:
- ✅ Unlimited workouts saved
- ✅ 5 OCR scans per week (up from 1)
- ✅ Full workout history (unlimited)
- ✅ No ads
- ✅ 10 AI enhancements/month (Phase 6)
- ✅ Automatic PR detection (all formulas)
- ✅ Advanced stats dashboard
- ✅ Body metrics tracking (weight, body fat %)
- ✅ Progress photos (up to 50)
- ✅ PDF export

**AI Features (Phase 6)**:
- 10 AI workout enhancements/month
- Training profile setup
- Generic Workout of the Day (same for all users)

**Target User**: 
- Casual gym-goers who workout 3-4x/week
- People who want to track progress without advanced features
- Users who occasionally see workouts on Instagram

**Upgrade Prompts**:
- "You've used 5 OCR scans this week. Upgrade to Pro for unlimited."
- "Want personalized AI workouts? Upgrade to Pro."
- "Unlock advanced body metrics tracking with Pro."

**Conversion Goal**: 25% → Pro
**ARPU**: $7.99 (margin: ~85% after costs)

---

### Pro Tier - $14.99/month or $149.99/year (17% savings)

**Unlocked from Starter**:
- ✅ Unlimited OCR scans (no weekly limit)
- ✅ 30 AI enhancements/month
- ✅ 30 AI workout generations/month
- ✅ Personalized Workout of the Day (adapts to PRs/history)
- ✅ Advanced analytics (volume trends, muscle distribution)
- ✅ Body measurements (all 8 measurements)
- ✅ Progress photos (unlimited)
- ✅ Custom exercise creation (unlimited)
- ✅ Rest timer widget
- ✅ Interval & HIIT timers
- ✅ JSON export

**AI Features (Phase 6)**:
- 30 AI workout enhancements/month
- 30 AI workout generations/month
- Personalized WOD daily (uses your PRs, history, goals)
- Smart workout suggestions based on training profile
- Form cues and tips on exercises

**Target User**:
- Serious gym-goers who train 5-6x/week
- People who regularly save Instagram workouts
- Users who want AI-powered recommendations
- Athletes tracking detailed progress

**Upgrade Prompts**:
- "You've used 30 AI requests this month. Upgrade to Elite for unlimited."
- "Want an AI coach? Unlock Elite tier for personalized daily coaching."
- "Join crew challenges with Elite membership."

**Conversion Goal**: 10% → Elite
**ARPU**: $14.99 (margin: ~80% after AI costs)

---

### Elite Tier - $34.99/month or $349.99/year (17% savings)

**Unlocked from Pro**:
- ✅ 100 AI enhancements/month (soft cap, not truly unlimited)
- ✅ 100 AI workout generations/month (soft cap)
- ✅ AI Coach (Phase 7) - 20 messages/day limit
  - Daily check-ins (morning/evening)
  - Nutrition guidance
  - Recovery recommendations
  - Progress summaries
  - PR congratulations
- ✅ Crew features (Phase 8)
  - Add up to 50 crew members
  - Crew leaderboards
  - Workout completion notifications
  - Quips and reactions
  - Crew challenges
- ✅ Priority support (email response within 24 hours)
- ✅ Early access to new features
- ✅ Custom branding (profile customization)

**AI Coach Features (Phase 7)**:
- Conversational AI trainer (Claude-powered)
- Morning motivation: "Ready for today's workout?"
- Evening check-in: "How did your workout go?"
- Nutrition advice (macros, meal timing)
- Recovery optimization (rest day suggestions)
- Weekly progress summaries
- PR congratulations and milestone celebrations

**Target User**:
- Elite athletes and serious bodybuilders
- People who want accountability and coaching
- Users who train with friends/crew
- Fitness influencers and coaches

**ARPU**: $34.99 (margin: ~70% after AI coach costs)

---

## Pricing Comparison (Old vs New)

| Tier | Old Price | New Price | Increase |
|------|-----------|-----------|----------|
| Free | $0 | $0 | - |
| Starter | $4.99 | $7.99 | +60% |
| Pro | $9.99 | $14.99 | +50% |
| Elite | $19.99 | $34.99 | +75% |

**Rationale for Price Increases**:
- Better margins for AI costs
- Industry competitive (Fitbod: $12-15/mo, Strong: $4.99/mo, JEFIT: $12.99/mo)
- Elite tier severely underpriced at $19.99 for AI coach
- Room for promotional discounts
- Perceived value alignment

---

## Plan Completeness Review

### ✅ What's Complete:

1. **Platform Strategy** - Clear separation of Web/Android/iOS
2. **Android Architecture** - Full folder structure + code examples
3. **Share Extension** - Complete ShareActivity implementation
4. **OCR Service** - AWS Textract integration with parsing logic
5. **Subscription System** - Google Play Billing implementation
6. **Timeline** - 90-day phase breakdown
7. **Pricing Tiers** - All four tiers with features
8. **Budget** - Monthly costs for all scenarios
9. **Success Metrics** - Launch goals and KPIs
10. **Development Setup** - Windows 11 + Android Studio instructions

---

## ⚠️ What's Missing/Needs Clarification

### 1. Backend API Endpoints

**Status**: Referenced but not documented

The plan references existing APIs but doesn't document them. Android needs:

**Required Endpoints**:
- `POST /api/auth/login` - Login endpoint
- `POST /api/auth/signup` - Signup endpoint
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/ocr/process` - OCR processing
- `GET /api/workouts` - List workouts (with pagination)
- `GET /api/workouts/:id` - Get workout detail
- `POST /api/workouts` - Create workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout
- `GET /api/workouts/count` - Get workout count (for free tier limit)
- `POST /api/subscription/sync` - Sync Google Play purchase with backend
- `GET /api/subscription/status` - Check subscription status
- `GET /api/stats/prs` - Get personal records
- `POST /api/body-metrics` - Add body metrics
- `GET /api/body-metrics` - Get body metrics history

**Action Required**: Document existing API endpoints or specify what needs to be built.

---

### 2. Subscription Backend Sync Logic

**Status**: Not implemented

How does Google Play Billing sync with Stripe/DynamoDB?

**Missing Flow**:
```
User purchases on Android
  ↓
Google Play Billing validates purchase
  ↓
Android app receives purchase token
  ↓
Android calls POST /api/subscription/sync with:
  {
    "platform": "android",
    "purchaseToken": "...",
    "productId": "starter_monthly",
    "orderId": "GPA.1234..."
  }
  ↓
Backend validates token with Google Play Developer API
  ↓
Backend updates DynamoDB user record:
  {
    subscription: {
      tier: "starter",
      platform: "android",
      purchaseToken: "...",
      expiresAt: "2025-11-20T00:00:00Z",
      autoRenewing: true
    }
  }
  ↓
Backend creates/updates Stripe subscription (for unified reporting)
  ↓
Backend returns updated subscription status
```

**Required Implementation**:
- Lambda function to validate Google Play purchases
- DynamoDB update logic
- Webhook handler for Google Play Real-time Developer Notifications
- Stripe subscription mirror (optional)

**Action Required**: Implement backend endpoint to sync Google Play purchases.

---

### 3. OCR Quota Tracking

**Status**: Not implemented

How is OCR quota tracked across platforms?

**Proposed Solution**:
```javascript
// DynamoDB User Record
{
  userId: "user_123",
  email: "user@example.com",
  subscription: {
    tier: "starter",
    ocrQuota: {
      current: 3,        // OCR scans used this week
      limit: 5,          // Weekly limit for starter tier
      resetDate: "2025-10-27T00:00:00Z"  // Next Sunday midnight UTC
    },
    workoutCount: 12,    // For free tier 15-workout limit
    createdAt: "2025-10-01T00:00:00Z"
  }
}
```

**API Flow**:
```
Android calls POST /api/ocr/process
  ↓
Backend checks:
  - if (currentDate > resetDate) { reset quota to 0, set new resetDate }
  - if (current >= limit) { return 429 Too Many Requests with upgrade prompt }
  ↓
If OK:
  - Process OCR with Textract
  - Increment ocrQuota.current
  - Return OCR result
```

**Quota Limits by Tier**:
- Free: 1/week
- Starter: 5/week
- Pro: Unlimited (999/week soft cap)
- Elite: Unlimited (999/week soft cap)

**Action Required**: Implement quota tracking in backend.

---

### 4. Workout Limit Tracking (Free Tier)

**Status**: Not implemented

How is the 15 workout limit enforced?

**Proposed Solution**:

**Backend**:
```javascript
// POST /api/workouts endpoint
async function createWorkout(userId, workoutData) {
  const user = await getUser(userId);
  
  if (user.subscription.tier === 'free') {
    if (user.subscription.workoutCount >= 15) {
      return {
        status: 403,
        error: 'WORKOUT_LIMIT_REACHED',
        message: "You've reached your 15 workout limit. Upgrade to Starter for unlimited workouts.",
        upgradeUrl: "/subscription/upgrade"
      };
    }
  }
  
  // Create workout
  const workout = await saveWorkout(workoutData);
  
  // Increment counter
  await incrementWorkoutCount(userId);
  
  return { status: 200, workout };
}

// GET /api/workouts/count endpoint
async function getWorkoutCount(userId) {
  const user = await getUser(userId);
  return {
    count: user.subscription.workoutCount,
    limit: user.subscription.tier === 'free' ? 15 : null
  };
}
```

**Android**:
```kotlin
// Check before creating workout
suspend fun createWorkout(workout: Workout): Result<Workout> {
    val countResponse = api.getWorkoutCount()
    
    if (subscriptionTier == SubscriptionTier.FREE && countResponse.count >= 15) {
        return Result.failure(WorkoutLimitException())
    }
    
    return api.createWorkout(workout)
}
```

**Action Required**: Implement count endpoint and enforcement logic.

---

### 5. Image Upload for OCR

**Status**: Approach not specified

The ShareActivity saves image locally, but how does it get to AWS?

**Option A: Base64 Upload (Simple)**
```
Android:
1. Save shared image to internal storage
2. Convert to Base64 (max 5MB)
3. POST /api/ocr/process with { imageData: "base64...", userId: "..." }

Backend (Lambda):
1. Decode Base64 to image buffer
2. Upload to S3 bucket: s3://spotbuddy-ocr/{userId}/{timestamp}.jpg
3. Trigger Textract: detectDocumentText(s3Key)
4. Parse workout from OCR text
5. Return { rawText, parsedWorkout, confidence }

Pros: Simple implementation
Cons: 5MB payload limit, higher Lambda memory usage
```

**Option B: Presigned S3 URLs (Efficient)**
```
Android:
1. GET /api/ocr/upload-url → returns { uploadUrl, s3Key }
2. PUT image directly to S3 presigned URL (no size limit)
3. POST /api/ocr/process with { s3Key, userId }

Backend:
1. Lambda generates presigned URL for S3 PUT
2. Client uploads directly to S3
3. Client triggers processing Lambda
4. Lambda reads from S3, processes with Textract
5. Return OCR result

Pros: Efficient for large images, lower Lambda costs
Cons: More complex, requires two API calls
```

**Recommendation**: Use Option A for MVP (simpler), upgrade to Option B later if needed.

**Action Required**: Implement chosen approach in backend.

---

### 6. Cross-Platform Workout Sync

**Status**: Assumed but not documented

How do workouts sync between Web/Android/iOS?

**Assumed Strategy** (needs confirmation):
- All platforms read/write to same DynamoDB tables
- Each workout has `lastModifiedAt` timestamp
- Conflict resolution: last-write-wins
- Real-time sync: polling every 30 seconds (future: WebSocket)

**Sync Flow**:
```
User creates workout on Android
  ↓
Android POST /api/workouts → DynamoDB
  {
    id: "workout_123",
    userId: "user_123",
    title: "Push Day",
    exercises: [...],
    createdAt: "2025-10-20T10:00:00Z",
    lastModifiedAt: "2025-10-20T10:00:00Z",
    source: "android"
  }
  ↓
Web app polls GET /api/workouts?since=2025-10-20T09:50:00Z
  ↓
Web app receives new workout, updates local state
```

**Action Required**: Confirm sync strategy and implement polling.

---

### 7. Offline Support (Android)

**Status**: Mentioned but not specified

The plan mentions Room database but doesn't specify offline strategy.

**Proposed Strategy**:

**Room Schema**:
```kotlin
@Entity(tableName = "workouts")
data class WorkoutEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val title: String,
    val exercises: String,  // JSON string
    val createdAt: Long,
    val lastModifiedAt: Long,
    val syncStatus: SyncStatus,  // SYNCED, PENDING, FAILED
    val source: String
)

enum class SyncStatus {
    SYNCED,      // Saved to backend
    PENDING,     // Waiting for network
    FAILED       // Failed to sync, needs retry
}
```

**Write Flow**:
```
User creates workout (offline or online)
  ↓
1. Save to Room immediately (syncStatus = PENDING)
2. Show workout in UI (fast, local)
3. Background sync to DynamoDB when online
4. On success: Update syncStatus = SYNCED
5. On failure: syncStatus = FAILED, show retry option
```

**Read Flow**:
```
1. Load from Room (always fast, works offline)
2. Background sync from DynamoDB (when online)
3. Merge changes with conflict resolution
4. Update Room with remote changes
```

**Conflict Resolution**:
- Last-write-wins based on `lastModifiedAt`
- Local changes always visible immediately
- Remote changes merged in background

**Action Required**: Implement offline-first architecture with Room.

---

### 8. Testing Strategy

**Status**: Not mentioned

No testing plan provided.

**Recommended Testing Layers**:

**Unit Tests (JUnit + Mockito)**:
```kotlin
@Test
fun `workout parser extracts exercise name correctly`() {
    val parser = WorkoutParser()
    val text = "Bench Press 3x10 @ 135 lbs"
    
    val result = parser.parse(text)
    
    assertEquals("Bench Press", result.exercises[0].name)
    assertEquals(3, result.exercises[0].sets)
    assertEquals("10", result.exercises[0].reps)
    assertEquals("135 lbs", result.exercises[0].weight)
}
```

**Integration Tests (Retrofit + MockWebServer)**:
```kotlin
@Test
fun `OCR API returns parsed workout`() = runTest {
    val mockWebServer = MockWebServer()
    mockWebServer.enqueue(MockResponse().setBody("""
        {
          "rawText": "Bench Press 3x10",
          "parsedWorkout": {...},
          "confidence": 0.95
        }
    """))
    
    val ocrService = OcrService(mockWebServer.url("/"))
    val result = ocrService.processImage(bitmap, "user_123")
    
    assertTrue(result.isSuccess)
}
```

**UI Tests (Compose Testing)**:
```kotlin
@Test
fun `shows paywall when free user exceeds workout limit`() {
    composeTestRule.setContent {
        AddWorkoutScreen(
            viewModel = fakeViewModel(tier = FREE, workoutCount = 15)
        )
    }
    
    composeTestRule.onNodeWithText("Add Workout").performClick()
    composeTestRule.onNodeWithText("Upgrade to Starter").assertIsDisplayed()
}
```

**Manual Testing Checklist**:
- [ ] Instagram share from 10 different workout formats
- [ ] OCR accuracy on 50+ real screenshots
- [ ] Offline mode (airplane mode testing)
- [ ] Subscription purchase flow
- [ ] Free tier limit enforcement
- [ ] Cross-device sync

**Action Required**: Add testing section to plan and implement tests.

---

### 9. Error Handling & Logging

**Status**: Not specified

No error handling patterns defined.

**Recommended Approach**:

**Logging (Timber)**:
```kotlin
// Application class
class SpotBuddyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(CrashlyticsTree())
        }
    }
}

// Usage
Timber.d("OCR processing started")
Timber.e(exception, "Failed to sync workout")
```

**Crash Reporting (Firebase Crashlytics)**:
```kotlin
dependencies {
    implementation("com.google.firebase:firebase-crashlytics-ktx:18.6.0")
}

// Log non-fatal errors
try {
    ocrService.processImage(bitmap)
} catch (e: Exception) {
    FirebaseCrashlytics.getInstance().recordException(e)
    Timber.e(e, "OCR processing failed")
}
```

**User-Facing Error Messages**:
```kotlin
sealed class UIState<out T> {
    object Loading : UIState<Nothing>()
    data class Success<T>(val data: T) : UIState<T>()
    data class Error(
        val message: String,
        val action: ErrorAction? = null
    ) : UIState<Nothing>()
}

enum class ErrorAction {
    RETRY,
    UPGRADE,
    LOGIN,
    CONTACT_SUPPORT
}

// ViewModel
_uiState.value = UIState.Error(
    message = "Failed to process image. Please try again.",
    action = ErrorAction.RETRY
)
```

**Action Required**: Add error handling patterns and implement Timber + Crashlytics.

---

### 10. Analytics & Monitoring

**Status**: Not specified

How do you track user behavior?

**Recommended: Firebase Analytics (Free)**

**Setup**:
```kotlin
dependencies {
    implementation("com.google.firebase:firebase-analytics-ktx:21.5.0")
}

// Track events
fun logOCRScan(source: String) {
    analytics.logEvent("ocr_scan") {
        param("source", source)  // "instagram", "screenshot"
        param("subscription_tier", currentTier)
    }
}

fun logWorkoutCreated(method: String) {
    analytics.logEvent("workout_created") {
        param("method", method)  // "ocr", "manual", "share"
        param("exercise_count", exerciseCount)
    }
}

fun logSubscriptionPurchase(tier: String, price: Double) {
    analytics.logEvent(FirebaseAnalytics.Event.PURCHASE) {
        param(FirebaseAnalytics.Param.ITEM_ID, tier)
        param(FirebaseAnalytics.Param.VALUE, price)
        param(FirebaseAnalytics.Param.CURRENCY, "USD")
    }
}
```

**Key Events to Track**:
- Sign-up method (google, email)
- OCR scan (source, success rate)
- Workout created (method)
- Workout completed
- Subscription purchase
- Subscription upgrade
- Paywall shown
- Feature usage (timers, stats, etc)
- App crashes

**Alternative: Mixpanel or Amplitude** (more powerful, paid)

**Action Required**: Choose analytics platform and implement tracking.

---

### 11. Push Notifications (Phase 7)

**Status**: Mentioned for Phase 7, not implemented

AI Coach needs push notifications but not specified for Android.

**Will Need**:

**Firebase Cloud Messaging (FCM)**:
```kotlin
dependencies {
    implementation("com.google.firebase:firebase-messaging-ktx:23.4.0")
}

// Service to handle notifications
class SpotBuddyMessagingService : FirebaseMessagingService() {
    
    override fun onMessageReceived(message: RemoteMessage) {
        message.notification?.let {
            showNotification(it.title, it.body)
        }
    }
    
    override fun onNewToken(token: String) {
        // Send token to backend
        api.updateFCMToken(token)
    }
}
```

**Backend (AWS SNS)**:
```javascript
// Send push notification
async function sendPushNotification(userId, message) {
  const user = await getUser(userId);
  const fcmToken = user.fcmToken;
  
  await sns.publish({
    TargetArn: fcmToken,
    Message: JSON.stringify({
      notification: {
        title: "Spot Buddy",
        body: message
      },
      data: {
        type: "ai_coach",
        action: "open_chat"
      }
    })
  });
}
```

**Notification Types (Phase 7)**:
- Morning motivation: "Good morning! Ready for today's workout?"
- Evening check-in: "Did you complete your workout?"
- PR congratulations: "New PR! You bench pressed 225 lbs!"
- Crew activity: "John completed Push Day"
- Reminder: "You have a scheduled workout today"

**Action Required**: Add to Phase 7 planning.

---

### 12. App Store Listing Requirements

**Status**: Mentioned but not detailed

Both Android and iOS need marketing assets.

**Google Play Store Requirements**:

**Required**:
- App icon: 512x512px (PNG, no transparency)
- Feature graphic: 1024x500px
- Screenshots: 2-8 images (1080x1920px for phone)
- Short description: Max 80 characters
- Full description: Max 4000 characters
- Privacy policy URL
- Content rating questionnaire

**Optional but Recommended**:
- Promo video: 30-120 seconds (YouTube link)
- Screenshots for tablet: 7" and 10" tablets
- TV banner: 1280x720px (if supporting Android TV)

**Apple App Store Requirements** (Phase later):
- App icon: 1024x1024px (PNG, no transparency)
- Screenshots: 
  - iPhone 6.7": 1290x2796px (required)
  - iPhone 6.5": 1284x2778px
  - iPad Pro 12.9": 2048x2732px
- App preview video: Max 30 seconds
- Privacy policy URL
- Terms of service URL (if selling content)
- App description: No character limit
- Promotional text: 170 characters

**Action Required**: Create marketing assets before launch.

---

## 🎯 Recommendations for Completion

### Before Starting Android Development:

#### 1. Document Backend APIs (2 hours)
- [ ] List all existing endpoints
- [ ] Identify what needs to be built
- [ ] Create API specification (OpenAPI/Swagger)
- [ ] Document request/response formats
- [ ] Document error codes

#### 2. Implement Subscription Sync (4 hours)
- [ ] Build `/api/subscription/sync` endpoint
- [ ] Integrate Google Play Developer API
- [ ] Test purchase validation
- [ ] Implement webhook handler for subscription changes

#### 3. Implement OCR Quota System (3 hours)
- [ ] Add quota fields to DynamoDB user table
- [ ] Implement weekly reset logic (Lambda + EventBridge)
- [ ] Test quota enforcement in `/api/ocr/process`
- [ ] Add quota check to API response

#### 4. Implement Workout Limit (2 hours)
- [ ] Add workout count tracking to user table
- [ ] Implement count increment on workout creation
- [ ] Add `GET /api/workouts/count` endpoint
- [ ] Test free tier enforcement

#### 5. Choose Image Upload Strategy (1 hour)
- [ ] Decide: Base64 vs Presigned URLs
- [ ] Implement chosen approach
- [ ] Test with 5MB+ images
- [ ] Document API endpoint

#### 6. Set Up Analytics (1 hour)
- [ ] Create Firebase project
- [ ] Add Firebase to Android app config
- [ ] Implement key event tracking
- [ ] Test events in Firebase console

#### 7. Error Handling Setup (1 hour)
- [ ] Add Timber dependency
- [ ] Add Firebase Crashlytics
- [ ] Implement error state patterns
- [ ] Document error codes

#### 8. Testing Setup (2 hours)
- [ ] Add JUnit, Mockito, MockWebServer dependencies
- [ ] Create test folder structure
- [ ] Write first unit test
- [ ] Set up CI/CD for automated testing (optional)

**Total Prep Time**: ~16 hours to have backend ready for Android development

---

## Final Assessment

**Overall Completeness**: 85%

### ✅ Excellent:
- Architecture design
- UI implementation examples
- Timeline planning
- Pricing structure

### ⚠️ Missing (15%):
- Backend API documentation (critical)
- Subscription sync implementation (critical)
- Quota/limit enforcement (critical)
- Offline sync strategy (important)
- Testing strategy (important)
- Error handling patterns (important)
- Analytics implementation (nice-to-have)

---

## Recommended Next Steps

### Option A: Backend-First Approach (Recommended)
**Week 1**: Complete all backend prerequisites (16 hours)
**Week 2-13**: Android development (unblocked, smooth progress)

**Pros**: 
- No blocked progress
- Can test backend independently
- Clear separation of concerns

**Cons**: 
- Delays Android UI work by 1 week

---

### Option B: Parallel Development
**Week 1-2**: Android UI + Backend prerequisites simultaneously
**Week 3-13**: Feature implementation (may encounter blocks)

**Pros**: 
- Faster to first UI
- Learn Android patterns early

**Cons**: 
- Risk of blocked progress waiting for backend
- Context switching between Android and backend

---

## Recommendation

**Use Option A (Backend-First)**. Spend 1-2 days building backend pieces before starting Android UI. This prevents blocked progress and enables:
- Independent testing of OCR pipeline
- Subscription flow validation
- API contract definition
- Smoother Android development

**Next Document to Create**: Backend API Specification with all endpoints, request/response formats, and authentication.

---

**Document Version**: 1.0  
**Status**: Pre-Development Review  
**Owner**: Alex  
**Next Action**: Review this document, then create Backend API Specification
