# Spot Buddy Android Deployment Plan

**Last Updated:** November 30, 2024
**Status:** Ready for Implementation
**Backend:** 100% Ready (Production Deployed)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Backend Architecture](#current-backend-architecture)
3. [Authentication System](#authentication-system)
4. [Subscription & Monetization](#subscription--monetization)
5. [Android App Architecture](#android-app-architecture)
6. [Implementation Phases](#implementation-phases)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Monitoring & Analytics](#monitoring--analytics)

---

## Executive Summary

### What is Spot Buddy?

Spot Buddy is a comprehensive fitness tracking application that allows users to:
- Track workouts with detailed exercise, set, and rep data
- Scan workout images using OCR (Instagram screenshots, gym whiteboards)
- Monitor personal records (PRs) and progress over time
- Access AI-powered workout insights (paid tiers)
- Sync data across web and mobile platforms

### Backend Status

✅ **Production Ready** - Backend deployed at `https://spotter.cannashieldct.com`
- Next.js 14 API routes on AWS ECS
- DynamoDB for user data & workouts
- Stripe for subscriptions (Live Mode)
- NextAuth for authentication (Google, Facebook, Email/Password)
- AWS infrastructure fully operational

### Android App Objective

Build a native Android app (Kotlin/Java or React Native) that:
1. Provides seamless authentication (Google, Facebook, Email/Password)
2. Syncs with existing backend API
3. Offers subscription management via web checkout (App Store compliant)
4. Delivers core workout tracking features
5. Maintains feature parity with web app

---

## Current Backend Architecture

### Tech Stack

```
┌─────────────────────────────────────────┐
│  Frontend (Android App)                 │
│  - Kotlin/Java OR React Native          │
│  - Native Android UI/Components         │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS API Calls
               │
┌──────────────▼──────────────────────────┐
│  Backend API (Next.js 14)               │
│  URL: https://spotter.cannashieldct.com │
│  - /api/auth/* (NextAuth)               │
│  - /api/workouts/*                      │
│  - /api/stripe/*                        │
│  - /api/user/*                          │
│  - /api/mobile/* (new endpoints)        │
└──────────────┬──────────────────────────┘
               │
               ├──► DynamoDB (AWS)
               │    - users table (EmailIndex GSI)
               │    - workouts table
               │    - stripeCustomerId-index GSI
               │
               ├──► Stripe (Live Mode)
               │    - Subscriptions
               │    - Customer Portal
               │    - Webhooks
               │
               └──► AWS Services
                    - S3 (workout images)
                    - CloudWatch (logs)
                    - ECS (container hosting)
```

### Database Schema (DynamoDB)

**users table:**
```typescript
{
  id: string (UUID, primary key)
  email: string (unique, indexed via EmailIndex GSI)
  firstName: string | null
  lastName: string | null
  passwordHash: string | null // For email/password auth

  // OAuth
  provider: string // "google" | "facebook" | "credentials"

  // Subscription
  subscriptionTier: string // "free" | "starter" | "pro" | "elite"
  subscriptionStatus: string // "active" | "inactive" | "trialing" | "canceled"
  stripeCustomerId: string (indexed via stripeCustomerId-index GSI)
  stripeSubscriptionId: string
  subscriptionStartDate: string (ISO)
  subscriptionEndDate: string (ISO)
  trialEndsAt: string (ISO)

  // Usage Quotas
  ocrQuotaUsed: number
  ocrQuotaLimit: number
  ocrQuotaResetDate: string (ISO)
  workoutsSaved: number
  aiRequestsUsed: number
  aiRequestsLimit: number
  lastAiRequestReset: string (ISO)

  // Training Profile
  trainingProfile: object {
    experience: string
    goals: string[]
    equipment: string[]
  }

  // Timestamps
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

**workouts table:**
```typescript
{
  userId: string (partition key)
  workoutId: string (sort key, UUID)
  date: string (ISO date)
  name: string
  notes: string
  exercises: [{
    name: string
    sets: [{
      reps: number
      weight: number
      unit: "lbs" | "kg"
      restTime: number (seconds)
    }]
  }]
  duration: number (seconds)
  totalVolume: number
  imageUrl: string (S3 URL)
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

---

## Authentication System

### Available Authentication Methods

Our backend supports **three authentication providers**:

#### 1. Google OAuth
- **Provider ID:** `google`
- **Scopes:** email, profile, openid
- **Client Flow:** Authorization Code Grant
- **Mobile Implementation:** Use Google Sign-In SDK for Android
- **Tokens:** Handled by NextAuth on backend

#### 2. Facebook OAuth
- **Provider ID:** `facebook`
- **Scopes:** email, public_profile
- **Mobile Implementation:** Use Facebook Login SDK for Android
- **Tokens:** Handled by NextAuth on backend

#### 3. Email/Password (Credentials)
- **Provider ID:** `credentials`
- **Features:**
  - Password hashing with bcrypt (12 rounds)
  - Minimum 8 characters required
  - Auto-verified email for password signups
  - Sign up via `/api/auth/signup`
  - Sign in via NextAuth CredentialsProvider
- **Mobile Implementation:** Standard email/password input fields

### Authentication Flow for Android

```
┌─────────────────┐
│  Android App    │
│                 │
│  1. User taps   │
│     "Sign in    │
│     with Google"│
└────────┬────────┘
         │
         │ 2. Launch Google Sign-In SDK
         │
┌────────▼────────────────────┐
│  Google OAuth Consent       │
│  - User approves            │
│  - Returns auth code        │
└────────┬────────────────────┘
         │
         │ 3. Exchange code for token
         │    (Google SDK handles this)
         │
┌────────▼────────────────────┐
│  Backend API                │
│  POST /api/auth/callback/   │
│  google                     │
│                             │
│  - Receives OAuth token     │
│  - Checks DynamoDB for      │
│    existing user (by email) │
│  - Creates OR links user    │
│  - Returns session token    │
└────────┬────────────────────┘
         │
         │ 4. Return session cookie/JWT
         │
┌────────▼────────┐
│  Android App    │
│  - Store token  │
│  - Navigate to  │
│    main screen  │
└─────────────────┘
```

### Recent Authentication Improvements

✅ **Duplicate User Prevention** (Nov 29, 2024)
- `signIn` callback checks for existing user by email **before** creating new user
- Race condition protection with `ConditionExpression` in DynamoDB
- Duplicate detection logging for monitoring

✅ **Email/Password Authentication** (Nov 28, 2024)
- Removed broken EmailProvider (magic links)
- Added proper signup API: `POST /api/auth/signup`
- CredentialsProvider validates password hashes
- Passwords never logged or exposed in responses

✅ **GSI for Fast Lookups** (Nov 28, 2024)
- `EmailIndex` GSI on users table for email lookups
- `stripeCustomerId-index` GSI for webhook performance
- Prevents O(n) table scans

### Android Implementation Options

**Option A: React Native (Recommended)**
```bash
# Dependencies
npm install @react-native-google-signin/google-signin
npm install react-native-fbsdk-next
npm install @react-native-async-storage/async-storage
npm install axios
```

**Option B: Native Kotlin/Java**
```gradle
// build.gradle
dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    implementation 'com.facebook.android:facebook-login:16.1.3'
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
}
```

### Session Management

**Web Cookies (Current):**
- `next-auth.session-token` (httpOnly, sameSite: lax, 30 days)
- Domain: `.cannashieldct.com` (production)
- Auto-refreshes every 5 minutes of activity

**Android Session (Recommended):**
- Store JWT in Android KeyStore (encrypted)
- Use Retrofit/OkHttp interceptor to add `Authorization: Bearer <token>`
- Implement refresh token flow
- Clear session on logout

---

## Subscription & Monetization

### Subscription Tiers

| Tier | Price | Features | Limits |
|------|-------|----------|--------|
| **Free** | $0/month | - 1 OCR scan/month<br>- 3 Instagram saves/week<br>- 31 workouts max<br>- Basic tracking | - No AI features<br>- No advanced analytics |
| **Starter** | $7.99/month | - 3 OCR scans/week<br>- 5 Instagram saves/week<br>- Unlimited workouts<br>- 10 AI requests/month | - Basic analytics<br>- PRs tracking |
| **Pro** | $14.99/month | - 5 OCR scans/week<br>- 7 Instagram saves/week<br>- Unlimited workouts<br>- 30 AI requests/month | - AI workout features<br>- Crew features<br>- Advanced analytics |
| **Elite** | $34.99/month | - 10 OCR scans/week<br>- 12 Instagram saves/week<br>- Unlimited workouts<br>- 100 AI requests/month | - Priority support<br>- Social features |

### Stripe Configuration

**Live Mode Credentials:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ELITE=price_...
```

**Webhook Events Handled:**
- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.created` - Subscription confirmed
- `customer.subscription.updated` - Tier changes, renewals
- `customer.subscription.deleted` - Cancellations
- `invoice.payment_succeeded` - Successful payments
- `invoice.payment_failed` - Failed payments

### App Store Compliance (CRITICAL!)

⚠️ **Cannot Use Stripe In-App for Digital Goods**

According to Apple App Store and Google Play Store policies:
- Digital goods (subscriptions, premium features) **must** use in-app purchases
- Redirecting to external web checkout is **allowed** (App Store compliant)
- Using Stripe within the app violates store policies (app rejection risk)

**Recommended Approach: Web-Based Checkout**

```kotlin
// Android - Open browser for checkout
fun upgradeSubscription(tier: String) {
    val checkoutUrl = createCheckoutSession(tier) // Call backend API
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
    startActivity(intent)

    // Deep link will return user to app after payment
}
```

**Deep Link Configuration:**

```xml
<!-- AndroidManifest.xml -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="spotbuddy"
        android:host="subscription" />
</intent-filter>
```

**Return URLs:**
- Success: `spotbuddy://subscription/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel: `spotbuddy://subscription/cancel`

---

## Android App Architecture

### Recommended Architecture: MVVM + Clean Architecture

```
app/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── AuthApi.kt
│   │   │   ├── WorkoutApi.kt
│   │   │   ├── SubscriptionApi.kt
│   │   ├── dto/
│   │   │   ├── UserDto.kt
│   │   │   ├── WorkoutDto.kt
│   │   │   ├── SubscriptionDto.kt
│   │   └── interceptors/
│   │       ├── AuthInterceptor.kt
│   │       └── ErrorInterceptor.kt
│   ├── local/
│   │   ├── db/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── dao/
│   │   │   │   ├── WorkoutDao.kt
│   │   │   │   └── UserDao.kt
│   │   │   └── entities/
│   │   │       ├── WorkoutEntity.kt
│   │   │       └── UserEntity.kt
│   │   └── preferences/
│   │       └── SessionManager.kt
│   └── repository/
│       ├── AuthRepository.kt
│       ├── WorkoutRepository.kt
│       └── SubscriptionRepository.kt
├── domain/
│   ├── model/
│   │   ├── User.kt
│   │   ├── Workout.kt
│   │   ├── Exercise.kt
│   │   └── Subscription.kt
│   ├── usecase/
│   │   ├── auth/
│   │   │   ├── SignInWithGoogleUseCase.kt
│   │   │   ├── SignInWithEmailUseCase.kt
│   │   │   └── SignUpUseCase.kt
│   │   ├── workout/
│   │   │   ├── GetWorkoutsUseCase.kt
│   │   │   ├── CreateWorkoutUseCase.kt
│   │   │   └── UpdateWorkoutUseCase.kt
│   │   └── subscription/
│   │       ├── GetCurrentTierUseCase.kt
│   │       ├── UpgradeTierUseCase.kt
│   │       └── CancelSubscriptionUseCase.kt
├── presentation/
│   ├── ui/
│   │   ├── auth/
│   │   │   ├── LoginActivity.kt
│   │   │   └── SignUpActivity.kt
│   │   ├── workouts/
│   │   │   ├── WorkoutListFragment.kt
│   │   │   ├── WorkoutDetailFragment.kt
│   │   │   └── CreateWorkoutFragment.kt
│   │   ├── subscription/
│   │   │   └── SubscriptionFragment.kt
│   │   └── common/
│   │       └── MainActivity.kt
│   └── viewmodel/
│       ├── AuthViewModel.kt
│       ├── WorkoutViewModel.kt
│       └── SubscriptionViewModel.kt
└── di/
    ├── NetworkModule.kt
    ├── DatabaseModule.kt
    └── RepositoryModule.kt
```

### Key Libraries (Kotlin/Java)

```gradle
dependencies {
    // Networking
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'

    // Authentication
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    implementation 'com.facebook.android:facebook-login:16.1.3'

    // Local Storage
    implementation 'androidx.room:room-runtime:2.6.0'
    kapt 'androidx.room:room-compiler:2.6.0'
    implementation 'androidx.datastore:datastore-preferences:1.0.0'

    // Dependency Injection
    implementation 'com.google.dagger:hilt-android:2.48'
    kapt 'com.google.dagger:hilt-compiler:2.48'

    // UI
    implementation 'androidx.compose.ui:ui:1.5.4'
    implementation 'androidx.compose.material3:material3:1.1.2'
    implementation 'androidx.navigation:navigation-compose:2.7.5'

    // Image Loading
    implementation 'io.coil-kt:coil-compose:2.5.0'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'
}
```

---

## Implementation Phases

### Phase 1: Project Setup & Authentication (Week 1-2)

**1.1 Create Android Project**
```bash
# Option A: Android Studio
- New Project → Empty Compose Activity
- Package name: com.spotbuddy.android
- Minimum SDK: API 24 (Android 7.0)
- Kotlin DSL

# Option B: React Native
npx react-native init SpotBuddyAndroid
cd SpotBuddyAndroid
```

**1.2 Configure Dependencies**
- Add Retrofit, Hilt, Room (see libraries above)
- Configure ProGuard rules for release builds
- Set up build variants (debug, staging, production)

**1.3 Implement Authentication**

**Google Sign-In:**
```kotlin
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionManager: SessionManager
) {
    suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val response = authApi.signInWithGoogle(GoogleSignInRequest(idToken))
            sessionManager.saveToken(response.token)
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

**Email/Password Sign-In:**
```kotlin
suspend fun signInWithEmail(email: String, password: String): Result<User> {
    return try {
        val response = authApi.signInWithCredentials(
            CredentialsRequest(email, password)
        )
        sessionManager.saveToken(response.token)
        Result.success(response.user)
    } catch (e: HttpException) {
        when (e.code()) {
            401 -> Result.failure(InvalidCredentialsException())
            else -> Result.failure(e)
        }
    }
}
```

**Sign-Up:**
```kotlin
suspend fun signUp(email: String, password: String, firstName: String?, lastName: String?): Result<User> {
    return try {
        val response = authApi.signUp(
            SignUpRequest(email, password, firstName, lastName)
        )
        // Auto sign-in after successful signup
        signInWithEmail(email, password)
    } catch (e: HttpException) {
        when (e.code()) {
            409 -> Result.failure(UserAlreadyExistsException())
            else -> Result.failure(e)
        }
    }
}
```

**1.4 Session Management**
```kotlin
class SessionManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    suspend fun saveToken(token: String) {
        dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
        }
    }

    fun getToken(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[TOKEN_KEY]
        }
    }

    suspend fun clearSession() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
    }
}
```

**1.5 Testing Checklist**
- [ ] Google Sign-In launches consent screen
- [ ] Google Sign-In returns to app with token
- [ ] Facebook Sign-In works (if implemented)
- [ ] Email sign-in validates credentials
- [ ] Sign-up creates new user
- [ ] Session persists across app restarts
- [ ] Logout clears session
- [ ] Duplicate email shows error

---

### Phase 2: Core Workout Features (Week 3-4)

**2.1 Workout Data Models**
```kotlin
data class Workout(
    val id: String,
    val userId: String,
    val date: String, // ISO 8601
    val name: String,
    val notes: String?,
    val exercises: List<Exercise>,
    val duration: Int, // seconds
    val totalVolume: Double,
    val imageUrl: String?,
    val createdAt: String,
    val updatedAt: String
)

data class Exercise(
    val name: String,
    val sets: List<WorkoutSet>
)

data class WorkoutSet(
    val reps: Int,
    val weight: Double,
    val unit: String, // "lbs" | "kg"
    val restTime: Int? // seconds
)
```

**2.2 Workout Repository**
```kotlin
class WorkoutRepository @Inject constructor(
    private val workoutApi: WorkoutApi,
    private val workoutDao: WorkoutDao
) {
    // Fetch workouts from API, cache locally
    suspend fun getWorkouts(forceRefresh: Boolean = false): List<Workout> {
        if (forceRefresh || workoutDao.getWorkoutCount() == 0) {
            val apiWorkouts = workoutApi.getWorkouts()
            workoutDao.insertAll(apiWorkouts.map { it.toEntity() })
            return apiWorkouts
        }
        return workoutDao.getAllWorkouts().map { it.toDomain() }
    }

    suspend fun createWorkout(workout: Workout): Workout {
        val created = workoutApi.createWorkout(workout.toDto())
        workoutDao.insert(created.toEntity())
        return created
    }

    suspend fun updateWorkout(workout: Workout): Workout {
        val updated = workoutApi.updateWorkout(workout.id, workout.toDto())
        workoutDao.update(updated.toEntity())
        return updated
    }

    suspend fun deleteWorkout(workoutId: String) {
        workoutApi.deleteWorkout(workoutId)
        workoutDao.delete(workoutId)
    }
}
```

**2.3 Workout List UI (Jetpack Compose)**
```kotlin
@Composable
fun WorkoutListScreen(
    viewModel: WorkoutViewModel = hiltViewModel()
) {
    val workouts by viewModel.workouts.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Workouts") })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* Navigate to create */ }) {
                Icon(Icons.Default.Add, contentDescription = "Add workout")
            }
        }
    ) { padding ->
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.fillMaxSize())
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                items(workouts) { workout ->
                    WorkoutItem(
                        workout = workout,
                        onClick = { /* Navigate to detail */ }
                    )
                }
            }
        }
    }
}
```

**2.4 Testing Checklist**
- [ ] Workouts load from API
- [ ] Workouts cached locally (offline support)
- [ ] Create workout syncs to backend
- [ ] Update workout syncs to backend
- [ ] Delete workout syncs to backend
- [ ] Offline mode shows cached workouts
- [ ] Pull-to-refresh updates data

---

### Phase 3: Subscription Management (Week 5)

**3.1 Create Mobile Checkout Endpoint**

**Backend:** Create `src/app/api/mobile/checkout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getStripe } from '@/lib/stripe';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await req.json();

    if (!['starter', 'pro', 'elite'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const user = await dynamoDBUsers.get(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripe = getStripe();
    const priceId = SUBSCRIPTION_TIERS[tier].priceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: session.user.id }
      });
      customerId = customer.id;
      await dynamoDBUsers.upsert({
        id: session.user.id,
        email: user.email,
        stripeCustomerId: customerId
      });
    }

    // Create checkout session with mobile deep links
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `spotbuddy://subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `spotbuddy://subscription/cancel`,
      metadata: {
        userId: session.user.id,
        tier
      }
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('[Mobile Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

**3.2 Android Subscription Flow**

```kotlin
class SubscriptionRepository @Inject constructor(
    private val subscriptionApi: SubscriptionApi,
    private val context: Context
) {
    suspend fun createCheckoutSession(tier: String): Result<String> {
        return try {
            val response = subscriptionApi.createCheckoutSession(
                CheckoutRequest(tier)
            )
            Result.success(response.checkoutUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun openCheckout(checkoutUrl: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }

    suspend fun verifySubscription(): Result<SubscriptionStatus> {
        return try {
            val response = subscriptionApi.getSubscriptionStatus()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

**3.3 Handle Deep Link Return**

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data = intent?.data ?: return

        when (data.host) {
            "subscription" -> {
                when (data.lastPathSegment) {
                    "success" -> {
                        val sessionId = data.getQueryParameter("session_id")
                        // Wait for webhook to process (2-3 seconds)
                        lifecycleScope.launch {
                            delay(3000)
                            // Refresh user subscription status
                            viewModel.refreshSubscription()
                            // Show success message
                            showSuccessDialog()
                        }
                    }
                    "cancel" -> {
                        // User cancelled checkout
                        showCancelMessage()
                    }
                }
            }
        }
    }
}
```

**3.4 Subscription UI**

```kotlin
@Composable
fun SubscriptionScreen(
    viewModel: SubscriptionViewModel = hiltViewModel()
) {
    val currentTier by viewModel.currentTier.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Choose Your Plan",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Free Tier (Current)
        if (currentTier == "free") {
            CurrentTierCard(tier = "free")
        }

        // Paid Tiers
        listOf("starter", "pro", "elite").forEach { tier ->
            SubscriptionTierCard(
                tier = tier,
                isCurrent = currentTier == tier,
                onUpgrade = { viewModel.upgradeTo(tier) }
            )
        }

        if (isLoading) {
            CircularProgressIndicator()
        }
    }
}

@Composable
fun SubscriptionTierCard(
    tier: String,
    isCurrent: Boolean,
    onUpgrade: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = tier.capitalize(),
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = when(tier) {
                    "starter" -> "$7.99/month"
                    "pro" -> "$14.99/month"
                    "elite" -> "$34.99/month"
                    else -> "Free"
                },
                style = MaterialTheme.typography.bodyLarge
            )

            // Features list
            Column(modifier = Modifier.padding(vertical = 8.dp)) {
                getTierFeatures(tier).forEach { feature ->
                    Row {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = feature)
                    }
                }
            }

            if (!isCurrent) {
                Button(
                    onClick = onUpgrade,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Upgrade to ${tier.capitalize()}")
                }
            } else {
                Text(
                    text = "Current Plan",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
```

**3.5 Testing Checklist**
- [ ] Subscription tiers display correctly
- [ ] "Upgrade" button opens browser
- [ ] Stripe checkout loads
- [ ] Test payment completes (use test card)
- [ ] Deep link returns to app
- [ ] Webhook updates subscription in DynamoDB
- [ ] App refreshes and shows new tier
- [ ] Manage subscription opens customer portal
- [ ] Cancellation works

---

### Phase 4: Advanced Features (Week 6-7)

**4.1 OCR Workout Scanning**
- Camera integration for workout image capture
- Upload image to backend API
- Backend processes with OCR (Textract or Tesseract)
- Parse workout data from text
- Pre-fill workout creation form

**4.2 Personal Records (PRs) Tracking**
- Calculate PRs from workout history
- Display PR trends over time
- Highlight when user breaks a PR
- Graphs for weight progression

**4.3 Calendar View**
- Month/week view of workouts
- Color-code by workout type
- Quick workout creation from calendar
- Sync with device calendar (optional)

**4.4 Offline Support**
- Room database for local caching
- Queue API calls when offline
- Sync when connection restored
- Conflict resolution strategy

**4.5 Push Notifications**
- FCM (Firebase Cloud Messaging)
- Workout reminders
- Subscription expiration alerts
- New feature announcements

---

### Phase 5: Testing & Polish (Week 8)

**5.1 Unit Tests**
```kotlin
@Test
fun `signInWithEmail returns success with valid credentials`() = runTest {
    // Given
    val email = "test@example.com"
    val password = "password123"
    val mockResponse = SignInResponse(
        token = "mock_token",
        user = mockUser
    )
    coEvery { authApi.signInWithCredentials(any()) } returns mockResponse

    // When
    val result = authRepository.signInWithEmail(email, password)

    // Then
    assertTrue(result.isSuccess)
    assertEquals(mockUser, result.getOrNull())
}

@Test
fun `createWorkout updates local database`() = runTest {
    // Given
    val workout = mockWorkout
    coEvery { workoutApi.createWorkout(any()) } returns workout.toDto()

    // When
    workoutRepository.createWorkout(workout)

    // Then
    coVerify { workoutDao.insert(any()) }
}
```

**5.2 UI Tests**
```kotlin
@Test
fun loginScreen_displaysGoogleSignInButton() {
    composeTestRule.setContent {
        LoginScreen()
    }

    composeTestRule
        .onNodeWithText("Sign in with Google")
        .assertIsDisplayed()
}

@Test
fun workoutList_displaysWorkouts() {
    val mockWorkouts = listOf(mockWorkout1, mockWorkout2)
    val viewModel = WorkoutViewModel().apply {
        setWorkouts(mockWorkouts)
    }

    composeTestRule.setContent {
        WorkoutListScreen(viewModel = viewModel)
    }

    composeTestRule
        .onNodeWithText(mockWorkout1.name)
        .assertIsDisplayed()
}
```

**5.3 Integration Tests**
- End-to-end authentication flow
- Create → Read → Update → Delete workout
- Subscription upgrade flow
- Offline mode sync

**5.4 Performance Optimization**
- Image caching with Coil
- Lazy loading for workout lists
- Pagination for large datasets
- Background sync with WorkManager

**5.5 Accessibility**
- Content descriptions for images
- Text scaling support
- Screen reader compatibility
- Keyboard navigation

---

## API Endpoints Reference

### Authentication

**Sign Up**
```
POST /api/auth/signup
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

Response (201):
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}

Errors:
409 - User already exists
400 - Invalid email/password
```

**Sign In with Credentials**
```
POST /api/auth/callback/credentials
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionTier": "free"
  }
}

Errors:
401 - Invalid credentials
404 - User not found
```

**Get Current User**
```
GET /api/auth/session
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "starter",
    "subscriptionStatus": "active",
    "ocrQuotaUsed": 5,
    "ocrQuotaLimit": 12
  }
}
```

### Workouts

**Get All Workouts**
```
GET /api/workouts
Authorization: Bearer <token>

Response (200):
{
  "workouts": [
    {
      "id": "workout-uuid",
      "userId": "user-uuid",
      "date": "2024-11-30",
      "name": "Chest & Triceps",
      "exercises": [...],
      "duration": 3600,
      "totalVolume": 15000
    }
  ]
}
```

**Create Workout**
```
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "date": "2024-11-30",
  "name": "Leg Day",
  "notes": "Felt strong today",
  "exercises": [
    {
      "name": "Squat",
      "sets": [
        { "reps": 10, "weight": 225, "unit": "lbs" },
        { "reps": 8, "weight": 245, "unit": "lbs" }
      ]
    }
  ]
}

Response (201):
{
  "workout": {
    "id": "new-workout-uuid",
    ...
  }
}
```

**Update Workout**
```
PUT /api/workouts/:id
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "name": "Updated Name",
  "notes": "New notes",
  "exercises": [...]
}

Response (200):
{
  "workout": {...}
}
```

**Delete Workout**
```
DELETE /api/workouts/:id
Authorization: Bearer <token>

Response (204):
No content
```

### Subscriptions

**Create Checkout Session (Mobile)**
```
POST /api/mobile/checkout
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "tier": "starter" // or "pro", "elite"
}

Response (200):
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

**Get Subscription Status**
```
GET /api/stripe/subscription
Authorization: Bearer <token>

Response (200):
{
  "tier": "starter",
  "status": "active",
  "currentPeriodEnd": "2024-12-30T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

**Cancel Subscription**
```
POST /api/stripe/cancel
Authorization: Bearer <token>

Response (200):
{
  "message": "Subscription cancelled. Access until 2024-12-30"
}
```

**Customer Portal (Manage Subscription)**
```
POST /api/stripe/portal
Authorization: Bearer <token>

Response (200):
{
  "url": "https://billing.stripe.com/session/..."
}
```

### User Settings

**Update Profile**
```
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "firstName": "John",
  "lastName": "Doe"
}

Response (200):
{
  "user": {...}
}
```

---

## Testing Strategy

### Unit Testing

**Tools:**
- JUnit 5
- MockK (Kotlin mocking)
- Coroutines Test
- Truth (assertions)

**Coverage Targets:**
- Repositories: 90%+
- ViewModels: 85%+
- Use Cases: 90%+
- Utilities: 95%+

**Example Test:**
```kotlin
@Test
fun `getWorkouts fetches from API when cache is empty`() = runTest {
    // Given
    coEvery { workoutDao.getWorkoutCount() } returns 0
    coEvery { workoutApi.getWorkouts() } returns listOf(mockWorkoutDto)

    // When
    val result = workoutRepository.getWorkouts()

    // Then
    assertEquals(1, result.size)
    coVerify { workoutApi.getWorkouts() }
    coVerify { workoutDao.insertAll(any()) }
}
```

### Integration Testing

**Tools:**
- Hilt for dependency injection
- OkHttp MockWebServer
- Room in-memory database

**Test Scenarios:**
- [ ] Sign up → Sign in → Fetch workouts
- [ ] Create workout → Sync to API → Verify in database
- [ ] Go offline → Create workout → Come online → Verify sync
- [ ] Upgrade subscription → Verify tier change

### UI Testing

**Tools:**
- Espresso (View-based)
- Compose Test (Jetpack Compose)
- Screenshot testing

**Test Scenarios:**
- [ ] Login flow completes successfully
- [ ] Workout list displays and scrolls
- [ ] Create workout form validation works
- [ ] Subscription upgrade opens browser

### Manual Testing Checklist

**Authentication:**
- [ ] Google Sign-In works
- [ ] Facebook Sign-In works
- [ ] Email/Password sign-up works
- [ ] Email/Password sign-in works
- [ ] Session persists across app restarts
- [ ] Logout clears session

**Workouts:**
- [ ] Workouts load from API
- [ ] Create workout syncs
- [ ] Update workout syncs
- [ ] Delete workout syncs
- [ ] Offline mode shows cached data
- [ ] Pull-to-refresh updates data

**Subscriptions:**
- [ ] Free tier shows correct quotas
- [ ] Upgrade opens browser
- [ ] Payment completes (test mode)
- [ ] Tier updates in app
- [ ] Manage subscription works
- [ ] Cancel subscription works

**Edge Cases:**
- [ ] Network timeout handling
- [ ] Invalid credentials error
- [ ] API error responses
- [ ] Quota exceeded handling
- [ ] Expired session handling

---

## Deployment Checklist

### Pre-Deployment

**Code Quality:**
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] UI tests passing
- [ ] Code review completed
- [ ] Linting errors resolved
- [ ] ProGuard rules configured

**Security:**
- [ ] API keys in `local.properties` (not committed)
- [ ] HTTPS only for API calls
- [ ] Certificate pinning implemented
- [ ] Authentication tokens encrypted
- [ ] No secrets in code or resources

**Performance:**
- [ ] App size < 50MB
- [ ] Cold start < 3 seconds
- [ ] Network requests optimized
- [ ] Images compressed
- [ ] Database queries indexed

**Compliance:**
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] GDPR compliance (if EU users)
- [ ] App Store guidelines reviewed
- [ ] Play Store guidelines reviewed

### Google Play Console Setup

**1. Create App Listing**
- App name: "Spot Buddy"
- Short description (80 chars)
- Full description (4000 chars)
- Screenshots (at least 2 phone, 1 tablet)
- Feature graphic (1024x500)
- App icon (512x512)

**2. Content Rating**
- Complete questionnaire
- Expected: "Everyone" or "Teen"
- No ads for fitness app

**3. Pricing & Distribution**
- Free to download
- In-app purchases: No (using web checkout)
- Countries: Worldwide (or US-only initially)

**4. App Signing**
- Use Google Play App Signing
- Upload key certificate
- Configure signing key

**5. Release Tracks**
- Internal testing (first)
- Closed testing (beta)
- Open testing (public beta)
- Production (launch)

### Build Configuration

**build.gradle (app):**
```gradle
android {
    compileSdk 34

    defaultConfig {
        applicationId "com.spotbuddy.android"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release

            buildConfigField "String", "API_URL", "\"https://spotter.cannashieldct.com\""
        }
        debug {
            applicationIdSuffix ".debug"
            buildConfigField "String", "API_URL", "\"http://localhost:3000\""
        }
    }
}
```

**ProGuard Rules:**
```proguard
# Keep model classes (used in API calls)
-keep class com.spotbuddy.android.data.remote.dto.** { *; }
-keep class com.spotbuddy.android.domain.model.** { *; }

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
```

### Release Build

**Generate Release APK/AAB:**
```bash
# Clean build
./gradlew clean

# Build release bundle (for Play Store)
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab

# Or build APK (for direct install)
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

**Upload to Play Console:**
1. Navigate to Play Console → Your App → Production
2. Click "Create new release"
3. Upload `app-release.aab`
4. Add release notes
5. Review and publish

### Post-Deployment

**Monitoring:**
- [ ] Set up Crashlytics (Firebase)
- [ ] Configure analytics
- [ ] Monitor ANR (Application Not Responding) rate
- [ ] Track API error rates
- [ ] Monitor subscription conversion rates

**User Feedback:**
- [ ] Enable in-app rating prompts
- [ ] Monitor Play Store reviews
- [ ] Set up support email
- [ ] Create FAQ/Help documentation

**Iteration:**
- [ ] Plan v1.1 features based on feedback
- [ ] Address critical bugs within 24 hours
- [ ] Weekly minor updates for polish
- [ ] Monthly feature releases

---

## Monitoring & Analytics

### Firebase Setup

**1. Add Firebase to Android App**
```bash
# Firebase Console → Add Android App
# Package name: com.spotbuddy.android
# Download google-services.json → app/ directory
```

**2. Dependencies**
```gradle
dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.5.0')
    implementation 'com.google.firebase:firebase-analytics-ktx'
    implementation 'com.google.firebase:firebase-crashlytics-ktx'
    implementation 'com.google.firebase:firebase-messaging-ktx'
}
```

### Key Metrics to Track

**User Acquisition:**
- New user sign-ups (by provider)
- Daily active users (DAU)
- Monthly active users (MAU)
- Retention rate (D1, D7, D30)

**Engagement:**
- Workouts created per user
- Average session duration
- Feature usage (OCR, PRs, calendar)
- Subscription upgrade rate

**Revenue:**
- Trial start rate
- Trial → paid conversion rate
- Churn rate
- Average revenue per user (ARPU)

**Technical:**
- Crash-free sessions
- API response times
- Network error rate
- Battery usage

### Analytics Events

```kotlin
// Track key user actions
analytics.logEvent("workout_created") {
    param("exercise_count", workout.exercises.size)
    param("duration_minutes", workout.duration / 60)
}

analytics.logEvent("subscription_upgraded") {
    param("from_tier", oldTier)
    param("to_tier", newTier)
    param("price", tier.price)
}

analytics.logEvent("ocr_scan_completed") {
    param("success", success)
    param("processing_time_ms", processingTime)
}
```

### Crashlytics Integration

```kotlin
class CrashReporting {
    fun logError(error: Throwable, context: String) {
        FirebaseCrashlytics.getInstance().apply {
            setCustomKey("context", context)
            setCustomKey("user_tier", currentUserTier)
            recordException(error)
        }
    }

    fun setUserId(userId: String) {
        FirebaseCrashlytics.getInstance().setUserId(userId)
    }
}
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Create Android Project**
   - Android Studio → New Project
   - Configure dependencies
   - Set up Git repository

2. **Backend API Endpoint**
   - Create `/api/mobile/checkout/route.ts`
   - Test with curl/Postman

3. **Authentication POC**
   - Implement Google Sign-In
   - Test sign-in flow end-to-end

### Short-Term (Next 2 Weeks)

4. **Core Features**
   - Workout list screen
   - Create workout flow
   - Local caching with Room

5. **Testing**
   - Write unit tests
   - Set up CI/CD pipeline

### Medium-Term (Next Month)

6. **Subscription Flow**
   - Implement checkout flow
   - Test with Stripe test mode
   - Deploy to internal testing

7. **Polish**
   - UI/UX improvements
   - Performance optimization
   - Accessibility

### Long-Term (Next Quarter)

8. **Beta Testing**
   - Closed beta with 50 users
   - Gather feedback
   - Iterate on features

9. **Production Launch**
   - Open testing (public beta)
   - Marketing campaign
   - Production release

10. **Post-Launch**
    - Monitor metrics
    - Fix critical bugs
    - Plan v2 features

---

## Resources & Support

### Documentation
- [Spot Buddy Web App](https://spotter.cannashieldct.com)
- [Stripe Mobile Integration](https://docs.stripe.com/mobile)
- [Android Developers Guide](https://developer.android.com)
- [Jetpack Compose Docs](https://developer.android.com/jetpack/compose)

### Backend Docs in `/docs`
- `EMAIL-PASSWORD-AUTH-SETUP.md` - Authentication system details
- `MOBILE-STRIPE-IMPLEMENTATION-PLAN.md` - Stripe integration guide
- `STRIPE-INTEGRATION-REVIEW.md` - Current Stripe setup
- `MONITORING-GUIDE.md` - Backend monitoring

### Tools
- Android Studio Arctic Fox or later
- Postman (API testing)
- Firebase Console
- Stripe Dashboard

### Support Channels
- GitHub Issues: (Your repo URL)
- Email: support@spotbuddy.com
- Discord/Slack: (Community channel)

---

## Conclusion

This deployment plan provides a comprehensive roadmap for building the Spot Buddy Android app. The backend is **100% production-ready** with robust authentication, subscription management, and data sync capabilities.

**Key Takeaways:**

✅ Backend is deployed and operational
✅ Authentication supports Google, Facebook, Email/Password
✅ Stripe subscriptions fully configured (Live Mode)
✅ DynamoDB schema optimized with GSIs
✅ Duplicate user prevention implemented
✅ App Store compliant subscription flow

**Estimated Timeline:**
- **Phase 1 (Auth):** 2 weeks
- **Phase 2 (Workouts):** 2 weeks
- **Phase 3 (Subscriptions):** 1 week
- **Phase 4 (Advanced):** 2 weeks
- **Phase 5 (Testing):** 1 week
- **Total:** ~8 weeks to production-ready app

Ready to start building! 🚀
