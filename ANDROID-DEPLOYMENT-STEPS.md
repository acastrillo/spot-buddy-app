# Android Deployment Steps - Spot Buddy

**Date**: January 24, 2025
**Status**: Implementation Guide
**Target**: Convert Next.js web app to native Android app with Instagram share sheet integration

---

## Overview

This guide covers two different approaches for Android deployment:

1. **Option A: Web Wrapper with Capacitor** - Quick deployment (~4-6 hours)
   - Uses Capacitor to wrap Next.js app in WebView
   - Faster to market
   - Limited native integration
   - **Best for: MVP launch**

2. **Option B: Native Kotlin App** - Full native experience (~90 days)
   - Native Kotlin app with shared AWS backend
   - Best performance and UX
   - Instagram share sheet integration
   - **Best for: Production quality**

**Recommendation**: Start with Option A for quick launch, then build Option B for best experience.

---

## Option A: Capacitor Web Wrapper (Recommended for MVP)

### Prerequisites

- Node.js 18+ installed
- Android Studio installed
- Java JDK 17+ installed
- Android SDK configured

### Step 1: Install Capacitor

```bash
cd c:/spot-buddy-web

# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init
# App name: Spot Buddy
# Package ID: com.spotbuddy.app
# Web asset directory: out
```

### Step 2: Configure Next.js for Static Export

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static export for Capacitor
  images: {
    unoptimized: true,  // Required for static export
  },
  // ... rest of config
}
```

**Important**: Static export has limitations:
- No API routes (use external API server)
- No server-side rendering
- No dynamic routes with fallback
- No image optimization

**Workaround**: Deploy Next.js app separately to AWS ECS for API routes, use Capacitor app to call APIs.

### Step 3: Update Capacitor Configuration

Edit `capacitor.config.json`:

```json
{
  "appId": "com.spotbuddy.app",
  "appName": "Spot Buddy",
  "webDir": "out",
  "server": {
    "url": "https://spotter.cannashieldct.com",
    "cleartext": false,
    "allowNavigation": [
      "spotter.cannashieldct.com",
      "cognito-idp.us-east-1.amazonaws.com"
    ]
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000
    }
  }
}
```

**Note**: `server.url` points to your live Next.js deployment, so the app loads the web version inside a WebView.

### Step 4: Add Android Platform

```bash
# Install Android plugin
npm install @capacitor/android

# Add Android platform
npx cap add android
```

This creates an `android/` directory with a complete Android Studio project.

### Step 5: Build and Sync

```bash
# Build Next.js app
npm run build

# Export static files
npm run export  # Or the build already does this if output: 'export'

# Sync web code to Android
npx cap sync android
```

### Step 6: Configure Android Manifest

Edit `android/app/src/main/AndroidManifest.xml` to add Instagram share intent handling:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.spotbuddy.app">

    <!-- Internet permission for WebView -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <!-- Package visibility for Instagram (Android 11+) -->
    <queries>
        <package android:name="com.instagram.android" />
        <intent>
            <action android:name="com.instagram.share.ADD_TO_STORY" />
            <data android:mimeType="image/*" />
        </intent>
    </queries>

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Handle Instagram share intent -->
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="image/*" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Step 7: Open in Android Studio

```bash
npx cap open android
```

This opens Android Studio with your project.

### Step 8: Build and Run

1. In Android Studio, wait for Gradle sync to complete
2. Connect an Android device or start an emulator
3. Click the green **Run** button (or press Shift+F10)
4. Select your device
5. App installs and launches

### Step 9: Add Instagram Share Handling

Create a Capacitor plugin to handle Instagram shares:

```bash
npm install @capacitor/share
```

Update your Next.js code to use the Capacitor Share API:

```typescript
import { Share } from '@capacitor/share';

async function handleInstagramShare(imageUrl: string) {
  await Share.share({
    title: 'Shared from Instagram',
    text: 'Check out this workout!',
    url: imageUrl,
    dialogTitle: 'Share workout',
  });
}
```

**Limitation**: This uses the system share sheet, not a direct Instagram integration.

---

## Option B: Native Kotlin App (Recommended for Production)

### Why Native Kotlin?

- **Best Performance**: Native code runs faster than WebView
- **Instagram Share Sheet**: Direct integration with Instagram's share interface
- **Offline-First**: Room database for local storage with background sync
- **Better UX**: Native UI components (Material Design 3)
- **Full Control**: Access to all Android APIs

### Architecture

```
┌─────────────────────────────────────────┐
│          Native Kotlin App             │
│  (Android with Jetpack Compose UI)     │
└─────────────────┬───────────────────────┘
                  │
                  │ REST API Calls
                  │ (Retrofit + OkHttp)
                  ↓
┌─────────────────────────────────────────┐
│       Shared AWS Backend               │
│  • DynamoDB (workouts, users)          │
│  • Cognito (authentication)            │
│  • Textract (OCR)                      │
│  • Bedrock (AI features)               │
│  • Stripe (subscriptions)              │
└─────────────────────────────────────────┘
                  ↑
                  │ Same APIs
                  │
┌─────────────────┴───────────────────────┐
│      Next.js Web App (Existing)        │
│  (Deployed on ECS Fargate)             │
└─────────────────────────────────────────┘
```

### Development Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1**: Project Setup | 1 week | Android Studio, Kotlin, Gradle, dependencies |
| **Phase 2**: Authentication | 2 weeks | AWS Cognito integration, Google OAuth |
| **Phase 3**: Instagram Share | 2 weeks | Share intent handling, OCR integration |
| **Phase 4**: Workout Features | 4 weeks | Library, calendar, stats, timers |
| **Phase 5**: AI Features | 3 weeks | Workout parser, generator, training profile |
| **Phase 6**: Polish & Testing | 2 weeks | UI refinement, bug fixes, testing |
| **Phase 7**: Google Play Launch | 1 week | Screenshots, description, release |

**Total**: ~90 days (3 months)

### Tech Stack

```kotlin
// Build configuration (build.gradle.kts)
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp") // Kotlin Symbol Processing
}

dependencies {
    // UI - Jetpack Compose (Modern declarative UI)
    implementation("androidx.compose.ui:ui:1.7.0")
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.compose.ui:ui-tooling-preview:1.7.0")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.5")

    // Networking - Retrofit + OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Local Database - Room
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    ksp("androidx.room:room-compiler:2.7.0")

    // Dependency Injection - Hilt
    implementation("com.google.dagger:hilt-android:2.54.1")
    ksp("com.google.dagger:hilt-android-compiler:2.54.1")

    // AWS SDK - Cognito, Textract, Bedrock
    implementation("com.amazonaws:aws-android-sdk-core:2.77.0")
    implementation("com.amazonaws:aws-android-sdk-cognitoidentityprovider:2.77.0")
    implementation("com.amazonaws:aws-android-sdk-textract:2.77.0")

    // Image Loading - Coil
    implementation("io.coil-kt:coil-compose:3.0.4")

    // Google Sign-In
    implementation("com.google.android.gms:play-services-auth:21.3.0")

    // Stripe SDK
    implementation("com.stripe:stripe-android:21.4.2")

    // WorkManager (background sync)
    implementation("androidx.work:work-runtime-ktx:2.10.0")
}
```

### Project Structure

```
android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/spotbuddy/app/
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/           # Room database
│   │   │   │   │   │   ├── dao/         # Data Access Objects
│   │   │   │   │   │   ├── entities/    # Database entities
│   │   │   │   │   │   └── AppDatabase.kt
│   │   │   │   │   ├── remote/          # API clients
│   │   │   │   │   │   ├── api/         # Retrofit interfaces
│   │   │   │   │   │   ├── dto/         # Data Transfer Objects
│   │   │   │   │   │   └── AuthInterceptor.kt
│   │   │   │   │   └── repository/      # Repository pattern
│   │   │   │   ├── domain/
│   │   │   │   │   ├── model/           # Domain models
│   │   │   │   │   └── usecase/         # Business logic
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/            # Login screen
│   │   │   │   │   ├── library/         # Workout library
│   │   │   │   │   ├── add/             # Add workout
│   │   │   │   │   ├── calendar/        # Calendar view
│   │   │   │   │   ├── stats/           # Stats & PRs
│   │   │   │   │   ├── settings/        # Settings
│   │   │   │   │   └── components/      # Reusable UI
│   │   │   │   ├── util/
│   │   │   │   │   ├── InstagramShareHandler.kt
│   │   │   │   │   ├── OCRProcessor.kt
│   │   │   │   │   └── Extensions.kt
│   │   │   │   └── MainActivity.kt
│   │   │   ├── res/
│   │   │   │   ├── drawable/           # Icons, images
│   │   │   │   ├── layout/             # XML layouts (if any)
│   │   │   │   ├── values/             # Strings, colors, themes
│   │   │   │   └── xml/                # FileProvider paths
│   │   │   └── AndroidManifest.xml
│   │   └── test/                       # Unit tests
│   └── build.gradle.kts
├── gradle/
└── build.gradle.kts
```

### Instagram Share Intent Handler

**File**: `app/src/main/java/com/spotbuddy/app/util/InstagramShareHandler.kt`

```kotlin
package com.spotbuddy.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class InstagramShareHandler(private val context: Context) {

    /**
     * Handle Instagram share intent
     * Called when user shares from Instagram to Spot Buddy
     */
    suspend fun handleIncomingShare(intent: Intent): InstagramShareData? {
        return withContext(Dispatchers.IO) {
            when (intent.action) {
                Intent.ACTION_SEND -> {
                    if (intent.type?.startsWith("image/") == true) {
                        val imageUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                        imageUri?.let { processSharedImage(it) }
                    } else null
                }
                else -> null
            }
        }
    }

    /**
     * Process shared image from Instagram
     */
    private suspend fun processSharedImage(uri: Uri): InstagramShareData {
        // 1. Copy image to internal storage
        val savedFile = saveImageLocally(uri)

        // 2. Extract text using AWS Textract (OCR)
        val ocrText = performOCR(savedFile)

        // 3. Parse workout using AI
        val parsedWorkout = parseWorkout(ocrText)

        return InstagramShareData(
            imageUri = uri,
            savedImagePath = savedFile.absolutePath,
            ocrText = ocrText,
            parsedWorkout = parsedWorkout
        )
    }

    /**
     * Save shared image to internal storage
     */
    private fun saveImageLocally(uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)
        val fileName = "instagram_${System.currentTimeMillis()}.jpg"
        val outputFile = File(context.cacheDir, fileName)

        inputStream?.use { input ->
            outputFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        return outputFile
    }

    /**
     * Perform OCR using AWS Textract
     */
    private suspend fun performOCR(imageFile: File): String {
        // TODO: Implement AWS Textract integration
        // Call /api/ocr endpoint from Next.js backend
        return ""
    }

    /**
     * Parse workout from OCR text
     */
    private suspend fun parseWorkout(ocrText: String): Workout? {
        // TODO: Implement workout parsing
        // Call /api/ai/enhance-workout endpoint
        return null
    }
}

data class InstagramShareData(
    val imageUri: Uri,
    val savedImagePath: String,
    val ocrText: String,
    val parsedWorkout: Workout?
)
```

### MainActivity Configuration

**File**: `app/src/main/java/com/spotbuddy/app/MainActivity.kt`

```kotlin
package com.spotbuddy.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.lifecycle.lifecycleScope
import com.spotbuddy.app.ui.theme.SpotBuddyTheme
import com.spotbuddy.app.util.InstagramShareHandler
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private lateinit var instagramShareHandler: InstagramShareHandler

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        instagramShareHandler = InstagramShareHandler(this)

        // Handle Instagram share intent on app launch
        handleIntent(intent)

        setContent {
            SpotBuddyTheme {
                // App navigation graph
                SpotBuddyApp()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent?.let {
            if (it.action == Intent.ACTION_SEND) {
                lifecycleScope.launch {
                    val shareData = instagramShareHandler.handleIncomingShare(it)
                    shareData?.let { data ->
                        // Navigate to Add Workout screen with shared data
                        navigateToAddWorkout(data)
                    }
                }
            }
        }
    }

    private fun navigateToAddWorkout(shareData: InstagramShareData) {
        // TODO: Implement navigation to Add Workout screen
        // Pass shareData to populate workout form
    }
}
```

### API Client Configuration

**File**: `app/src/main/java/com/spotbuddy/app/data/remote/api/SpotBuddyApi.kt`

```kotlin
package com.spotbuddy.app.data.remote.api

import com.spotbuddy.app.data.remote.dto.*
import retrofit2.http.*

interface SpotBuddyApi {

    // Authentication
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    // Workouts
    @GET("/api/workouts")
    suspend fun getWorkouts(): WorkoutsResponse

    @POST("/api/workouts")
    suspend fun createWorkout(@Body workout: CreateWorkoutRequest): WorkoutResponse

    @GET("/api/workouts/{id}")
    suspend fun getWorkout(@Path("id") workoutId: String): WorkoutResponse

    @PATCH("/api/workouts/{id}")
    suspend fun updateWorkout(
        @Path("id") workoutId: String,
        @Body updates: UpdateWorkoutRequest
    ): WorkoutResponse

    @DELETE("/api/workouts/{id}")
    suspend fun deleteWorkout(@Path("id") workoutId: String)

    // OCR
    @POST("/api/ocr")
    @Multipart
    suspend fun processOCR(@Part("image") image: MultipartBody.Part): OCRResponse

    // AI Enhancement
    @POST("/api/ai/enhance-workout")
    suspend fun enhanceWorkout(@Body request: EnhanceWorkoutRequest): EnhanceWorkoutResponse

    // Training Profile
    @GET("/api/user/profile")
    suspend fun getProfile(): ProfileResponse

    @PUT("/api/user/profile")
    suspend fun updateProfile(@Body profile: UpdateProfileRequest): ProfileResponse
}
```

### Retrofit Configuration

**File**: `app/src/main/java/com/spotbuddy/app/di/NetworkModule.kt`

```kotlin
package com.spotbuddy.app.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.spotbuddy.app.data.remote.api.SpotBuddyApi
import com.spotbuddy.app.data.remote.AuthInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "https://spotter.cannashieldct.com"

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder()
        .setLenient()
        .create()

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        authInterceptor: AuthInterceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit =
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

    @Provides
    @Singleton
    fun provideSpotBuddyApi(retrofit: Retrofit): SpotBuddyApi =
        retrofit.create(SpotBuddyApi::class.java)
}
```

---

## Development Setup

### Install Android Studio

1. Download Android Studio from https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio
4. Go to **Tools → SDK Manager**
5. Install:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools
   - Android Emulator

### Create New Android Project (Native Kotlin)

1. Open Android Studio
2. Click **New Project**
3. Select **Empty Activity** (Compose)
4. Configure:
   - Name: Spot Buddy
   - Package name: com.spotbuddy.app
   - Save location: C:/android-projects/spot-buddy-app
   - Language: Kotlin
   - Minimum SDK: API 26 (Android 8.0)
   - Build configuration language: Kotlin DSL (build.gradle.kts)
5. Click **Finish**

### Configure Gradle Dependencies

Copy the dependencies from the Tech Stack section into `app/build.gradle.kts`.

### Run on Emulator

1. Click **Device Manager** (phone icon in toolbar)
2. Click **Create Device**
3. Select **Pixel 6** → **Next**
4. Select **API 34** (Android 14) → **Next**
5. Click **Finish**
6. Click green **Run** button
7. Select your emulator
8. App builds and launches

---

## Next Steps

### Option A (Capacitor) Next Steps:

1. Test app on physical Android device
2. Configure app icons and splash screen
3. Add Capacitor plugins for camera, file access
4. Build signed APK for Google Play
5. Submit to Google Play Console

### Option B (Native Kotlin) Next Steps:

1. Set up project structure (packages, modules)
2. Implement authentication with AWS Cognito
3. Build Retrofit API client
4. Create Room database schema
5. Implement Instagram share handling
6. Build UI screens with Jetpack Compose
7. Add offline sync with WorkManager
8. Integrate AWS Textract for OCR
9. Connect AI features (Bedrock)
10. Test end-to-end workflow

---

## Key Differences: Capacitor vs Native

| Feature | Capacitor (Option A) | Native Kotlin (Option B) |
|---------|---------------------|-------------------------|
| **Development Time** | 1-2 weeks | 3 months |
| **Performance** | Good (WebView) | Excellent (Native) |
| **Instagram Share** | System share sheet | Direct intent handling |
| **Offline Support** | Limited | Full (Room database) |
| **Code Sharing** | Same codebase as web | Separate Android codebase |
| **Maintenance** | Easier (one codebase) | Two codebases (Web + Android) |
| **UX Quality** | Web-like | Native Android |
| **App Size** | ~15-20 MB | ~8-12 MB |

---

## Recommended Approach

**Phase 1 (Weeks 1-2)**: Deploy Option A (Capacitor)
- Quick launch to Google Play
- Validate market fit
- Gather user feedback
- Test monetization

**Phase 2 (Months 1-3)**: Build Option B (Native Kotlin)
- Superior UX and performance
- Full Instagram integration
- Offline-first architecture
- Production-grade quality

**Phase 3 (Month 4)**: Migrate users to native app
- Sunset Capacitor version
- Focus on native Android and iOS

---

## Resources

### Capacitor Resources
- Official Docs: https://capacitorjs.com/docs
- Next.js + Capacitor: https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/
- Share Plugin: https://capacitorjs.com/docs/apis/share

### Android Native Resources
- Kotlin Docs: https://kotlinlang.org/docs/home.html
- Jetpack Compose: https://developer.android.com/develop/ui/compose
- Room Database: https://developer.android.com/training/data-storage/room
- Retrofit: https://square.github.io/retrofit/
- Hilt DI: https://developer.android.com/training/dependency-injection/hilt-android
- Instagram Share: https://developer.android.com/training/sharing/send
- AWS Mobile SDK: https://aws.amazon.com/mobile/sdk/

### AWS Integration
- Cognito Android: https://docs.amplify.aws/lib/auth/getting-started/q/platform/android/
- Textract: https://docs.aws.amazon.com/textract/
- Bedrock Runtime: https://docs.aws.amazon.com/bedrock/

---

**Status**: Documentation complete
**Next Action**: Choose Option A or B and begin development
