# Spot Buddy Mobile App

[![Production](https://img.shields.io/badge/production-live-green)](https://spotter.cannashieldct.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Mobile Optimized](https://img.shields.io/badge/mobile-optimized-success)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Your Fitness Accountability Partner - Optimized for Mobile**

Spot Buddy is a modern fitness tracking application designed with mobile-first principles. Track workouts, monitor progress, and achieve your fitness goals on any device - from your phone to your tablet to your desktop.

🌐 **Live App**: [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com)

---

## 📱 Table of Contents

1. [Mobile App Overview](#mobile-app-overview)
2. [Current Mobile Features](#current-mobile-features)
3. [Mobile Architecture](#mobile-architecture)
4. [Mobile UI Components](#mobile-ui-components)
5. [Installation & Access](#installation--access)
6. [Mobile User Experience](#mobile-user-experience)
7. [Offline Support](#offline-support)
8. [Native App Roadmap](#native-app-roadmap)
9. [Technical Details](#technical-details)
10. [Contributing](#contributing)

---

## Mobile App Overview

### What is Spot Buddy Mobile?

Spot Buddy is currently a **Progressive Web App (PWA)** optimized for mobile devices, providing a native-like experience through your mobile browser. The app features:

- 📱 **Mobile-First Design** - Built from the ground up for touch interfaces
- 🔄 **Cross-Platform** - Works on iOS, Android, and desktop browsers
- ⚡ **Fast & Responsive** - Optimized performance on mobile networks
- 💾 **Offline Support** - Access your workouts even without internet
- 🎨 **Native Feel** - Touch-optimized UI with gesture support
- 🔐 **Secure** - OAuth authentication with session management

### Future Plans

A **native Android app** is in development. See [Native App Roadmap](#native-app-roadmap) for details.

---

## Current Mobile Features

### ✅ Core Mobile Features

#### 1. **Mobile Navigation**
- Bottom navigation bar (iOS/Android pattern)
- 5 primary screens: Home, Library, Add, Stats, Calendar
- Touch-optimized tap targets (minimum 44px)
- Active state indicators
- Hidden on desktop (md breakpoint and above)

#### 2. **Touch-Optimized UI**
- **Minimum Touch Targets**: 44px × 44px for all interactive elements
- **Gesture Support**: Swipe, tap, long-press interactions
- **Responsive Cards**: Adaptive layouts for different screen sizes
- **Mobile-First CSS**: Styles designed for small screens first

#### 3. **Workout Session Experience**
- **Card Carousel Navigation**: Swipe between exercises
- **One-Tap Completion**: Minimal friction during workouts
- **Auto-Advance Rest Timer**: Smart transitions between exercises
- **Session Duration Tracking**: Real-time elapsed time
- **Bottom Bar Timers**: EMOM, AMRAP, Tabata timer display
- **Flow State Design**: Research-backed UX (40% lower abandonment)

#### 4. **Workout Management**
- Browse workout library with infinite scroll
- Create workouts via multiple methods:
  - Manual entry
  - Instagram import (OCR)
  - AI-generated workouts
  - Image upload with text extraction
- Edit and update existing workouts
- Delete workouts with confirmation
- Filter and search functionality

#### 5. **Stats & Progress Tracking**
- Dashboard with key metrics:
  - Workouts this week
  - Total workouts
  - Hours trained
  - Current streak
- Personal records (PRs) tracking
- Body metrics and measurements
- Progress charts and visualizations
- Completion history

#### 6. **Offline Support**
- LocalStorage caching for workouts
- Offline-first architecture
- Auto-sync when connection restored
- Cached stats and metrics
- Queue API calls for later sync

#### 7. **Mobile Performance**
- Lazy loading for images
- Code splitting by route
- Optimized bundle size
- Fast page transitions
- Efficient re-renders with React 19

---

## Mobile Architecture

### Technology Stack

```
┌─────────────────────────────────────────┐
│  Mobile Browser (iOS Safari, Chrome)   │
│  - Progressive Web App                  │
│  - Service Worker (planned)             │
│  - LocalStorage Cache                   │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────┐
│  Next.js 15 Frontend                    │
│  - React 19 (Client Components)         │
│  - Server Components (SEO)              │
│  - App Router                           │
└──────────────┬──────────────────────────┘
               │
               ├──► API Routes (/api/*)
               │    - Workouts CRUD
               │    - Authentication
               │    - Subscriptions
               │
               └──► Backend Services
                    - DynamoDB
                    - AWS Cognito
                    - Stripe
                    - AWS Textract (OCR)
```

### Mobile-Specific Components

#### Layout Components
- `src/components/layout/mobile-nav.tsx` - Bottom navigation bar
- `src/components/layout/header.tsx` - Top header (responsive)

#### UI Components (Touch-Optimized)
All shadcn/ui components customized for mobile:
- `src/components/ui/button.tsx` - 44px minimum height
- `src/components/ui/card.tsx` - Touch-friendly cards
- `src/components/ui/dialog.tsx` - Full-screen on mobile
- `src/components/ui/sheet.tsx` - Bottom sheets for mobile

#### Mobile Pages
- `/` - Dashboard (mobile-optimized grid)
- `/library` - Workout list (infinite scroll)
- `/add` - Add workout (mobile forms)
- `/stats` - Analytics (responsive charts)
- `/calendar` - Calendar view (touch gestures)
- `/workout/[id]/session` - Workout session (card carousel)

---

## Mobile UI Components

### Mobile Navigation Component

Located at `src/components/layout/mobile-nav.tsx`

**Features:**
- Fixed bottom position (z-index: 50)
- 5 navigation items with icons
- Active state highlighting
- Special styling for "Add" button (primary CTA)
- Hidden on desktop (md breakpoint)
- Backdrop blur for modern effect

**Usage:**
```tsx
import { MobileNav } from "@/components/layout/mobile-nav"

export default function Layout({ children }) {
  return (
    <>
      <main>{children}</main>
      <MobileNav />
    </>
  )
}
```

### Responsive Design System

**Breakpoints:**
- `sm`: 640px
- `md`: 768px (mobile nav hides here)
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First Utilities:**
```css
/* Touch Target Minimum */
.min-h-touch { min-height: 44px; }

/* Responsive Containers */
.responsive-container {
  @apply px-4 sm:px-6 md:px-8 lg:px-12;
}

/* Touch-Friendly Buttons */
.btn-touch {
  @apply min-h-touch px-6 text-base;
}
```

---

## Installation & Access

### Progressive Web App (Current)

#### Access via Mobile Browser

1. **Open in Browser**
   ```
   iOS Safari: https://spotter.cannashieldct.com
   Android Chrome: https://spotter.cannashieldct.com
   ```

2. **Add to Home Screen**

   **iOS (Safari):**
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add"
   - App icon appears on home screen

   **Android (Chrome):**
   - Tap the menu (3 dots)
   - Tap "Add to Home Screen"
   - Tap "Add"
   - App icon appears on launcher

3. **Launch from Home Screen**
   - Tap the Spot Buddy icon
   - App opens in full-screen mode
   - Feels like a native app

#### Benefits of PWA Installation
- Full-screen mode (no browser chrome)
- Faster launch time
- App-like experience
- Appears in app switcher
- Offline access (with service worker)

---

## Mobile User Experience

### Mobile-Optimized Workflows

#### 1. **Quick Workout Logging**
```
Home Screen → Add Button (bottom nav) → Select Method → Log Workout
```
- 3-tap workflow
- No scrolling required
- Bottom nav always accessible

#### 2. **Start Workout Session**
```
Library → Select Workout → Start Session → Swipe Through Exercises
```
- Card carousel interface
- One-tap exercise completion
- Auto-advance rest timer
- Bottom bar for workout timer

#### 3. **Check Progress**
```
Home Screen → View Stats → Stats Tab (bottom nav) → View Charts
```
- Dashboard with key metrics
- Dedicated stats page
- Responsive charts
- Swipe between views

### Touch Interactions

**Supported Gestures:**
- **Tap** - Navigate, select, complete
- **Swipe** - Navigate carousel, dismiss dialogs
- **Long Press** - Quick actions, context menus
- **Pull to Refresh** - Update workout list
- **Pinch to Zoom** - Image viewing (planned)

### Performance Optimizations

**Mobile Network Optimization:**
- Lazy loading for images
- Code splitting by route
- Prefetch critical resources
- Optimistic UI updates
- Background sync (planned)

**Battery Optimization:**
- Efficient re-renders
- Throttled API calls
- Debounced search
- CSS animations with GPU acceleration

---

## Offline Support

### Current Implementation

**LocalStorage Caching:**
```typescript
// Workouts cached locally
localStorage.setItem('workouts', JSON.stringify(workouts))

// Completed workouts tracked
localStorage.setItem('completedWorkouts', JSON.stringify(completions))

// Offline-first data loading
const cachedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
```

**Offline Capabilities:**
- ✅ View cached workouts
- ✅ View cached stats
- ✅ Browse workout library (cached)
- ✅ View workout details (cached)
- ❌ Create workouts (requires connection)
- ❌ Update workouts (requires connection)
- ❌ Sync to cloud (requires connection)

### Planned: Service Worker

**Future Enhancements:**
```typescript
// Service Worker registration (planned)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workouts') {
    event.waitUntil(syncWorkouts())
  }
})
```

**Planned Offline Features:**
- Create workouts offline
- Queue updates for sync
- Background sync when online
- Push notifications
- Offline-first database (IndexedDB)

---

## Native App Roadmap

### Android Native App (In Planning)

**Status:** Design & Planning Phase
**Timeline:** Q2-Q3 2025
**Documentation:** See `docs/ANDROID-DEPLOYMENT-PLAN.md`

#### Planned Features

**Phase 1: Core Features (Weeks 1-2)**
- Native Android project setup
- Google OAuth authentication
- Email/password sign-in
- Session management

**Phase 2: Workout Features (Weeks 3-4)**
- Workout list (RecyclerView)
- Create workout flow
- Card carousel session (ViewPager2)
- Local Room database cache
- Sync with backend API

**Phase 3: Subscriptions (Week 5)**
- Web-based checkout (App Store compliant)
- Deep linking return flow
- Subscription status display
- Stripe Customer Portal integration

**Phase 4: Advanced Features (Weeks 6-7)**
- OCR workout scanning (Camera X)
- Personal records tracking
- Calendar view
- Push notifications (FCM)
- Offline queue with WorkManager

**Phase 5: Polish & Launch (Week 8)**
- Unit & UI tests
- Performance optimization
- Accessibility
- Beta testing
- Play Store release

#### Native App Architecture

**Technology Stack:**
- **Language:** Kotlin
- **Architecture:** MVVM + Clean Architecture
- **Dependency Injection:** Hilt
- **Networking:** Retrofit + OkHttp
- **Database:** Room
- **UI:** Jetpack Compose + Material 3
- **Image Loading:** Coil
- **Analytics:** Firebase Analytics + Crashlytics

**App Structure:**
```
app/
├── data/
│   ├── remote/        # API clients
│   ├── local/         # Room database
│   └── repository/    # Data repositories
├── domain/
│   ├── model/         # Business models
│   └── usecase/       # Business logic
├── presentation/
│   ├── ui/            # Composables
│   └── viewmodel/     # ViewModels
└── di/                # Dependency injection
```

### iOS Native App (Future)

**Status:** Planned for 2026
**Platform:** iOS 15+
**Technology:** SwiftUI + Combine

---

## Technical Details

### Mobile-Specific Configurations

#### Viewport Configuration
```typescript
// src/app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}
```

#### Mobile-First CSS
```css
/* src/app/globals.css */

/* Mobile-first responsive padding */
@responsive {
  .px-mobile { padding-left: 1rem; padding-right: 1rem; }
  .px-tablet { padding-left: 1.5rem; padding-right: 1.5rem; }
}

/* Touch target minimum */
.min-h-touch { min-height: 44px; }

/* Responsive containers */
.responsive-container {
  @apply px-4 sm:px-6 md:px-8 lg:px-12;
}
```

#### Tailwind Mobile Configuration
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      minHeight: {
        'touch': '44px',  // iOS Human Interface Guidelines
      },
      spacing: {
        '18': '4.5rem',   // Mobile bottom nav height
      },
    },
  },
}
```

### Performance Metrics

**Target Metrics:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

**Current Optimizations:**
- Server Components for initial render
- Dynamic imports for route splitting
- Image optimization with Next.js Image
- CSS optimization with Tailwind
- Font optimization (system fonts)

### Browser Support

**Mobile Browsers:**
- ✅ iOS Safari 14+
- ✅ Chrome for Android 90+
- ✅ Samsung Internet 14+
- ✅ Firefox for Android 90+
- ✅ Edge for Android 90+

**Desktop Browsers:**
- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Mobile Development Guide

### Running Locally on Mobile Device

#### Option 1: Local Network Testing

1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Find Your Local IP**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

3. **Access on Mobile**
   ```
   http://YOUR_IP:3000
   ```
   Example: `http://192.168.1.10:3000`

4. **Test Features**
   - Navigation
   - Touch interactions
   - Responsive layouts
   - Offline mode (disable network)

#### Option 2: Tunnel for External Testing

```bash
# Using ngrok
npx ngrok http 3000

# Or localtunnel
npx localtunnel --port 3000
```

Access the provided URL on any mobile device.

### Mobile Debugging

#### Chrome DevTools Mobile Emulation

1. Open Chrome DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select device preset or custom dimensions
4. Test responsive behavior

#### Safari Remote Debugging (iOS)

1. Enable Web Inspector on iOS:
   - Settings → Safari → Advanced → Web Inspector
2. Connect iPhone to Mac via USB
3. Safari → Develop → [Your iPhone] → [Page]

#### Android Remote Debugging

1. Enable USB Debugging on Android
2. Connect device via USB
3. Chrome → `chrome://inspect`
4. Select device and page

---

## Mobile Testing Checklist

### UX Testing

- [ ] Bottom navigation visible on all mobile pages
- [ ] Touch targets minimum 44px × 44px
- [ ] Swipe gestures work smoothly
- [ ] Forms keyboard-friendly
- [ ] No horizontal scroll
- [ ] Text readable without zoom
- [ ] Buttons not too close together
- [ ] Loading states clear
- [ ] Error messages visible

### Performance Testing

- [ ] Page loads < 3 seconds on 3G
- [ ] Smooth 60fps animations
- [ ] No janky scrolling
- [ ] Images load progressively
- [ ] Bundle size < 500KB (initial)
- [ ] No layout shift during load
- [ ] Efficient re-renders

### Offline Testing

- [ ] Cached workouts load offline
- [ ] Offline indicator shown
- [ ] Graceful degradation
- [ ] Sync when back online
- [ ] No data loss

### Cross-Device Testing

- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPad (tablet layout)
- [ ] Samsung Galaxy S23
- [ ] Google Pixel 7
- [ ] Various Android sizes

---

## Contributing to Mobile Development

### Mobile-First Development Guidelines

1. **Design for Mobile First**
   ```css
   /* Start with mobile styles */
   .component {
     padding: 1rem;
   }

   /* Add desktop enhancements */
   @media (min-width: 768px) {
     .component {
       padding: 2rem;
     }
   }
   ```

2. **Touch Target Sizes**
   - Minimum 44px × 44px (iOS guideline)
   - 48px × 48px preferred (Material Design)
   - Add padding, not margin, for larger hit areas

3. **Performance Budget**
   - JavaScript bundle < 500KB
   - Images optimized and lazy loaded
   - Critical CSS inlined
   - Non-critical CSS deferred

4. **Test on Real Devices**
   - Emulators are not enough
   - Test on low-end Android devices
   - Test on older iPhones
   - Test on slow 3G network

### Pull Request Guidelines

When contributing mobile features:

1. **Include Mobile Screenshots**
   - iPhone screenshot
   - Android screenshot
   - Tablet screenshot (if applicable)

2. **Test Checklist**
   - [ ] Tested on iOS Safari
   - [ ] Tested on Chrome Android
   - [ ] Responsive on all breakpoints
   - [ ] Touch interactions work
   - [ ] Offline mode tested
   - [ ] Performance profiled

3. **Documentation**
   - Update this README if adding mobile features
   - Document any new mobile components
   - Include usage examples

---

## Resources

### Documentation

- **[Main README](./data/docs/README.md)** - Full app documentation
- **[Android Deployment Plan](./docs/ANDROID-DEPLOYMENT-PLAN.md)** - Native Android app roadmap
- **[API Documentation](./docs/)** - Backend API reference
- **[Design System](./src/components/ui/)** - UI components library

### Mobile Design Guidelines

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design for Android](https://m3.material.io/)
- [Web.dev Mobile Guide](https://web.dev/mobile/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

### Developer Tools

- **Chrome DevTools** - Mobile emulation and debugging
- **Safari Web Inspector** - iOS debugging
- **Lighthouse** - Performance auditing
- **ngrok** - Mobile testing tunnel
- **BrowserStack** - Cross-device testing

---

## Mobile App Support

### Reporting Issues

For mobile-specific issues, please include:
- Device model and OS version
- Browser and version
- Screenshot or video
- Steps to reproduce
- Network conditions (if relevant)

**GitHub Issues:** [Create Issue](https://github.com/your-repo/spot-buddy-app/issues)

### Community

- **Discord:** [Join Community](#) (coming soon)
- **Email:** support@spotbuddy.com
- **Twitter:** [@SpotBuddyApp](#) (coming soon)

---

## License

This project is private and proprietary. All rights reserved.

---

## Acknowledgments

**Mobile UX Research:**
- Peloton Digital app UX patterns
- Nike Training Club workout sessions
- Strong app workout tracking
- Apple Fitness+ interface design

**Built With:**
- Next.js 15 - React framework
- React 19 - UI library
- Tailwind CSS - Styling
- shadcn/ui - Component library
- Zustand - State management

---

**Ready to Track Your Fitness Journey?** 💪

Visit [spotter.cannashieldct.com](https://spotter.cannashieldct.com) on your mobile device and add to home screen for the best experience!

**Native Android App Coming Soon** - Stay tuned for updates!
