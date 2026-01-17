# Kinex Fit - Nano Banana Pro Image Prompts + Instagram Captions

**✅ UPDATED VERSION - Based on Actual App UI (January 2026)**

**Optimized for Google Gemini 3 Pro Image Generation (Nano Banana Pro)**

This document contains image prompts and Instagram captions based on the **actual Kinex Fit web app UI**, not assumptions. All colors, fonts, and design elements match the production application.

---

## 🎨 ACTUAL APP DESIGN SYSTEM

**App Name:** Kinex Fit
**Design Philosophy:** Dark mode only, minimal, clean, mobile-first

### Color Palette (Exact Values)
```css
/* Primary */
--primary: #00D0BD          /* Cyan/Teal - main brand color */

/* Backgrounds */
--background: #1A1A1A       /* Very dark gray - main background */
--surface: #2A2A2A          /* Dark gray - cards and elevated surfaces */
--surface-elevated: #3A3A3A /* Lighter gray - hover states */

/* Text */
--text-primary: #FFFFFF     /* White - main text */
--text-secondary: #A0A0A0   /* Light gray - secondary text */
--text-tertiary: #666666    /* Dark gray - tertiary text */

/* UI Elements */
--border: #404040           /* Border color */
--input: #2A2A2A           /* Input backgrounds */

/* Semantic Colors */
--success: #22c55e          /* Green - success states */
--warning: #f59e0b          /* Orange/Amber - warnings */
--destructive: #ef4444      /* Red - errors/destructive actions */
--accent: #FF6B6B           /* Red accent */
--secondary: #7A7EFF        /* Purple secondary */
```

### Typography
- **Font Family:** Inter (Clean sans-serif)
- **Headings:** Inter Bold / Inter Semi-Bold
- **Body Text:** Inter Regular
- **Font Sizes:** 10px - 72px range

### UI Elements
- **Border Radius:** 12px (standard cards), 16px (larger elements)
- **Shadows:** Soft, subtle shadows in dark mode
- **Icons:** Lucide React icon library
- **Cards:** Dark surface (#2A2A2A) with 12px rounded corners
- **Buttons:**
  - Primary: Cyan (#00D0BD) with black text
  - Outline: Border with transparent background

---

## 📱 INSTAGRAM FEED POSTS (1080×1350px Portrait)

### Post 1: Instagram Import Feature - Before/After Split

**NANO BANANA PRO PROMPT:**
```
Create a modern split-screen mobile app marketing image in portrait orientation (1080x1350px) showing before-after comparison of workout organization.

LEFT SIDE - "Before Kinex Fit":
Background: Medium gray (#3A3A3A) with subtle texture
Show a cluttered iPhone screenshot collection:
- 35-40 workout screenshot thumbnails arranged haphazardly
- iOS screenshot borders visible (rounded corners, typical iOS styling)
- Screenshots overlapping slightly, creating visual chaos
- No organization, random placement
- Red X icon overlay (semi-transparent, positioned top-right, 80px size)
Bottom left corner: "Before Kinex Fit 😫" text in white Verdana Bold (36pt) with subtle shadow

RIGHT SIDE - "After Kinex Fit":
Background: Very dark background (#1A1A1A) - matching actual app
Show organized workout library interface:
- 3×4 grid layout (12 workout cards total)
- Each card styling:
  * Dark surface background (#2A2A2A)
  * 12px rounded corners
  * Soft shadow (0 4px 12px rgba(0,0,0,0.4))
  * 16px internal padding
- Card content (per card):
  * Small dumbbell icon (24px) in cyan (#00D0BD)
  * Workout title in white Inter Semi-Bold (14pt)
  * Metadata line: "8 exercises • 45 min" in gray (#A0A0A0, 11pt)
  * Difficulty badge: small pill ("Medium") in warning color
- Some cards have subtle cyan glow (#00D0BD at 20% opacity)
- Green checkmark overlay (semi-transparent, top-right, 80px size)
Bottom right corner: "After Kinex Fit ✨" text in white Verdana Bold (36pt) with subtle shadow

CENTER DIVIDER:
Thin vertical white line (2px width) perfectly centered, dividing both halves

BOTTOM BANNER:
Full-width banner across bottom:
- Dark overlay (#000000 at 85% opacity)
- Height: 120px
- Text: "Save Instagram workouts in 2 taps 🚀"
- Font: Inter Bold, 48pt, white color, center-aligned
- Subtle text glow for emphasis

TOP RIGHT CORNER:
Small "Kinex Fit" wordmark or logo in white (60px wide, subtle)

COMPOSITION: Perfect 50/50 vertical split, symmetrical, balanced visual weight

STYLE: Modern app marketing, dark UI showcase, clean and minimal, mobile-first aesthetic

LIGHTING: Even, flat lighting suitable for UI screenshots. Right side slightly brighter (10% more luminosity) to emphasize the "after" improvement.

COLOR ACCURACY (Critical - use exact hex values):
- Dark Background: #1A1A1A
- Card Surface: #2A2A2A
- Cyan Primary: #00D0BD
- White Text: #FFFFFF
- Gray Text: #A0A0A0
- Success Green: #22c55e
- Error Red: #ef4444

QUALITY: High-resolution UI rendering, crisp typography, perfect pixel alignment, professional marketing asset
```

**INSTAGRAM CAPTION:**
```
POV: You finally have a home for all those workout screenshots 📸✨

No more scrolling through your camera roll for 20 minutes trying to find that one workout from 3 weeks ago.

With Kinex Fit, you can:
✅ Save ANY Instagram workout in 2 taps
✅ Keep everything organized in your dark mode library
✅ Actually USE the workouts you save

Stop losing workouts. Start making progress. 💪

Try it free (no credit card required) 👉 Link in bio

—

#KinexFit #FitnessApp #WorkoutTracker #InstagramWorkouts #FitnessMotivation #GymLife #WorkoutPlanner #FitnessJourney #SaveWorkouts #FitnessGoals #DarkModeUI #WorkoutLibrary
```

---

### Post 2: AI Workout Generation Interface

**NANO BANANA PRO PROMPT:**
```
Create a sleek mobile app interface mockup in portrait orientation (1080x1350px) showcasing an AI workout generator with authentic dark mode UI.

DEVICE MOCKUP:
iPhone 15 Pro in space black:
- Realistic device frame with thin bezels
- Rounded corners matching actual iPhone design
- Slight 3D rotation (5° clockwise tilt)
- Floating against dark gradient background
- Subtle device shadow and reflection

PHONE SCREEN CONTENT (Exact Dark Mode UI):

TOP HEADER (First 20%):
- "AI Workout Generator" in white Inter Bold (28pt)
- Subheader: "Describe your perfect workout" in gray (#A0A0A0, 16pt)
- Spacing: 24px from top, 16px between lines

QUOTA CARD (Next 15%):
Dark card (#2A2A2A), 12px rounded corners, padding 16px:
- Left side: Zap icon (⚡) in cyan (#00D0BD, 24px)
- Center text:
  * "AI Generations Remaining" in white (14pt)
  * "Resets monthly" in gray (10pt)
- Right side: Large number "8 / 10" in cyan (#00D0BD, 32pt bold)

INPUT SECTION (Next 30%):
Large textarea with dark styling:
- Background: Dark surface (#2A2A2A)
- Border: 1px solid #404040
- Border radius: 12px
- Padding: 16px
- Visible typed text: "Upper body push, dumbbells only, 45 minutes, focus on chest and shoulders"
- Text color: White (#FFFFFF, 16pt Inter)
- Placeholder (if empty): Gray (#666666)
- Subtle cyan glow around border (#00D0BD at 15% opacity)
- Character count: "87 / 500" in small gray text (10pt) at bottom-right

GENERATE BUTTON (Below input):
- Full width button, 12px rounded corners
- Background: Cyan (#00D0BD)
- Text: "Generate Workout" in black (#000000, Inter Bold, 18pt)
- Sparkles icon (✨) before text
- Button height: 54px (touch-friendly)
- Subtle shadow for depth

EXAMPLE PROMPTS (Bottom):
Small heading: "Example prompts:" (gray, 12pt)
3 example chips visible:
- Each chip: Dark background (#3A3A3A), rounded pill, 8px padding
- Text: "Upper body push, 45 min, dumbbells" etc.
- Text color: Light gray (#A0A0A0, 11pt)

BACKGROUND (Behind phone):
Deep dark gradient:
- Top: #1A1A1A
- Bottom: #0A0A0A (even darker)
- Subtle geometric patterns (hexagons/circles) at 3% opacity for texture
- No bright or colorful gradients

OVERLAY TEXT (Around device):
Top area: "Your Personal AI Coach" in large white Inter Bold (52pt)
Below: "Personalized workouts in seconds" in gray (28pt)

COMPOSITION: Phone positioned slightly left of center (rule of thirds), text balanced on right

LIGHTING:
- Soft glow from phone screen (cyan tint)
- Subtle rim lighting on phone edges (white, very subtle)
- Dark ambient environment
- No dramatic lighting - clean product shot

STYLE: Modern dark UI showcase, minimal tech aesthetic, professional SaaS marketing, mobile app demonstration

QUALITY: Photorealistic device rendering, crisp UI elements, perfect typography, 8K resolution quality, production-ready asset

EXACT COLOR VALUES (CRITICAL):
- Primary Cyan: #00D0BD
- Background: #1A1A1A
- Surface: #2A2A2A
- Border: #404040
- White Text: #FFFFFF
- Gray Text: #A0A0A0
- Dark Gray Text: #666666
```

**INSTAGRAM CAPTION:**
```
Your workout. Your goals. Your equipment. Personalized in 10 seconds. 🤖✨

No more copying random programs from the internet that don't fit YOUR life.

Just tell our AI:
• Your goals (strength, size, endurance)
• Your available time
• Your equipment
• Any preferences

And get a perfectly tailored workout in seconds.

It's like having a personal trainer in your pocket. For $19.99/month instead of $400. 📱💪

Pro users get UNLIMITED AI workouts. Zero planning stress.

Start free 👉 Link in bio

—

What would you ask the AI to create for you? Comment below! 👇

—

#AIFitness #WorkoutGenerator #PersonalTrainer #FitnessAI #WorkoutPlanner #DarkModeUI #FitnessApp #TrainingPlan #CustomWorkout #FitnessCoach #SmartTraining #KinexFit
```

---

### Post 3: Progress Dashboard Showcase

**NANO BANANA PRO PROMPT:**
```
Create a premium mobile app interface showcasing a fitness progress dashboard in portrait format (1080x1350px) with authentic dark mode UI from Kinex Fit.

DEVICE:
iPhone 15 Pro Max in space black:
- Positioned at subtle 8° rotation angle
- Floating above very dark surface
- Realistic shadow and subtle reflection
- Thin bezels, rounded corners

SCREEN CONTENT - Actual Dark Mode Dashboard:

HEADER (Top 12%):
- "Dashboard" in large white Inter Bold (32pt)
- Subtitle: "Your fitness journey at a glance" in gray (#A0A0A0, 14pt)

STATS GRID (Next 30% - 2×2 grid layout):
Four stat cards, 12px gap between cards:

Each card structure:
- Background: Dark surface (#2A2A2A)
- Border radius: 12px
- Padding: 20px
- Subtle shadow: 0 4px 12px rgba(0,0,0,0.4)

CARD 1 (Top-Left) - Total Workouts:
- Icon: Dumbbell (Lucide icon) in cyan (#00D0BD, 32px)
- Number: "156" in large white bold (36pt Inter Bold)
- Label: "Total Workouts" in gray (#A0A0A0, 12pt)

CARD 2 (Top-Right) - Volume:
- Icon: Trending-Up in cyan (#00D0BD, 32px)
- Number: "342K" in large white bold (36pt)
- Sublabel: "lbs lifted" in gray (10pt)

CARD 3 (Bottom-Left) - Streak:
- Icon: Flame in orange (#ff6b6b, 32px)
- Number: "23" in large white bold (36pt)
- Sublabel: "days" in gray (10pt)

CARD 4 (Bottom-Right) - Duration:
- Icon: Activity in cyan (#00D0BD, 32px)
- Number: "52" in large white bold (36pt)
- Sublabel: "minutes" in gray (10pt)

CHART SECTION (Next 35%):
Bar chart card with dark styling:
- Card background: #2A2A2A, 12px rounded, padding 16px
- Title: "Workouts per Month" with Calendar icon (cyan, 20px)
- Chart background: Very dark (#1A1A1A)
- X-axis: Last 6 months (Aug, Sep, Oct, Nov, Dec, Jan)
- Y-axis: Count (0-30), labels in gray (#A0A0A0, 10pt)
- Bars: Cyan (#00D0BD) with rounded tops (8px radius)
- Grid lines: Very subtle dark gray (#333333, 1px)
- Chart area: Clean, minimal styling

PERSONAL RECORDS SECTION (Bottom 23%):
Dark card (#2A2A2A) with 12px rounded corners:
- Title: "Personal Records" with Trophy icon (gold #fbbf24)
- 3 PR entries listed:
  * "Bench Press - 225 lbs × 5"
  * "Squat - 315 lbs × 3"
  * "Deadlift - 405 lbs × 1"
- Each entry:
  * Medal/Award icon in gold (16px)
  * Exercise name in white (14pt)
  * Timestamp "2 days ago" in small gray (10pt)
  * 12px spacing between entries

BACKGROUND OUTSIDE PHONE:
Pure dark background (#1A1A1A) - no gradients

OVERLAY TEXT (Bottom third, beside phone):
- "See Your Progress" in large white Inter Bold (60pt)
- Subtitle: "Track PRs • Volume • Streaks" in gray (26pt)

COMPOSITION: Phone positioned slightly left of center, text on right creating balance

LIGHTING:
- Bright screen illumination from device
- Soft key light from top-left
- Subtle cyan rim light on right phone edge (from #00D0BD)
- Dark ambient environment

STYLE: Dark mode UI showcase, data visualization aesthetic, premium mobile app marketing, professional product photography

QUALITY: Photorealistic device rendering, crisp chart graphics, perfect typography, production-ready marketing asset

ACTUAL APP COLORS (EXACT VALUES REQUIRED):
- Primary: #00D0BD (Cyan)
- Background: #1A1A1A
- Surface: #2A2A2A
- Border: #404040
- Text: #FFFFFF (white), #A0A0A0 (gray), #666666 (dark gray)
- Success: #22c55e
- Warning: #f59e0b (orange for streak)
- Gold: #fbbf24 (for PRs)
```

**INSTAGRAM CAPTION:**
```
What gets measured gets improved. 📊💪

Every workout logged. Every PR tracked. Every pound lifted counted.

Watch your progress turn from numbers into unstoppable momentum.

With Kinex Fit, you get:
📈 Volume tracking over time
🏆 Automatic PR detection
🔥 Streak tracking for consistency
⏱️ Average workout duration
📊 Beautiful dark mode dashboards
💯 Exercise-specific progression

You can't improve what you don't track. Period.

The difference between someone who "goes to the gym" and someone who GETS RESULTS? Data.

Start tracking smarter 👉 Link in bio

—

Drop a 📊 if you track your workouts!

—

#FitnessTracking #ProgressNotPerfection #WorkoutData #PersonalRecords #FitnessGoals #ProgressTracking #PRTracking #DarkModeUI #GymProgress #TrainingData #FitnessStats #WorkoutLogger
```

---

### Post 4: Workout Library Grid View

**NANO BANANA PRO PROMPT:**
```
Create a clean mobile app interface screenshot in portrait format (1080x1350px) showing a workout library with actual dark mode UI from Kinex Fit.

DEVICE:
iPhone 15 Pro mockup:
- Simple front-facing view with minimal 3D effect (subtle depth)
- Space black color
- Realistic bezels and rounded corners

SCREEN CONTENT - Dark Mode Workout Library:

HEADER SECTION (Top 15%):
- Back arrow (←) icon on left (white, 24px)
- Title: "Workout Library" in white Inter Bold (28pt)
- Subtitle: "24 workouts saved" in gray (#A0A0A0, 14pt)
- Search bar:
  * Background: Dark input (#2A2A2A)
  * Border: 1px #404040
  * Border radius: 12px
  * Height: 44px (touch-friendly)
  * Magnifying glass icon (left, 20px, gray)
  * Placeholder: "Search workouts..." in gray (#666666, 14pt)
  * Padding: 12px horizontal

WORKOUT GRID (Middle 70%):
2-column grid layout, 6 cards visible (3 rows × 2 columns):

Grid spacing: 12px gaps between cards

INDIVIDUAL CARD DESIGN (repeated for each):
- Background: Dark surface (#2A2A2A)
- Border radius: 12px
- Shadow: 0 2px 8px rgba(0,0,0,0.3)
- Padding: 16px internal
- Hover state: Slightly elevated shadow

Card content structure:
1. Workout title (white, Inter Semi-Bold, 16pt, max 2 lines with ellipsis)
2. Optional description (gray #A0A0A0, Inter Regular, 12pt, max 2 lines, 8px margin-top)
3. Metadata row (12px margin-top):
   - Clock icon + "45 min" (gray #A0A0A0, 12pt)
   - Dumbbell icon + "8 exercises" (gray #A0A0A0, 12pt)
4. Badge row (8px margin-top):
   - Difficulty badge: Pill shape, 6px padding, rounded
     * "Easy" = Green bg (#22c55e at 10%), green text
     * "Medium" = Orange bg (#f59e0b at 10%), orange text
     * "Hard" = Red bg (#ef4444 at 10%), red text
5. Completion indicator (if > 0):
   - Green checkmark icon (16px)
   - Text: "3x" in success green (#22c55e, 12pt bold)
6. Footer (border-top #404040, padding-top 8px, margin-top 8px):
   - "Added Jan 10" in very small gray (#666666, 10pt)

EXAMPLE CARD TITLES (actual workout names):
1. "Push Day - Chest & Shoulders"
2. "Leg Day Strength Focus"
3. "Full Body HIIT Workout"
4. "Back & Biceps Hypertrophy"
5. "Core & Abs Circuit"
6. "Upper Body Pull Session"

BOTTOM NAVIGATION BAR (Bottom 12%):
Dark nav bar (#2A2A2A) with 5 icons evenly spaced:
- Home (house icon, gray)
- Library (folder icon, CYAN - ACTIVE)
- Add (plus in circle, slightly larger, gray)
- Stats (chart icon, gray)
- Profile (user icon, gray)
Active state: Cyan color (#00D0BD)
Inactive state: Gray (#666666)
Small labels below icons (8pt, gray)

BACKGROUND (App background):
Very dark background (#1A1A1A) - actual app background color

COMPOSITION: Centered phone, cards have consistent spacing, grid perfectly aligned, balanced layout

STYLE: Clean dark UI, authentic app screenshot, minimal and modern, mobile-first design, real product showcase

LIGHTING: Even, flat lighting suitable for UI screenshots - no dramatic shadows

TYPOGRAPHY: Inter font family throughout (matching actual app implementation)

EXACT APP COLORS (REQUIRED):
- Background: #1A1A1A
- Surface/Cards: #2A2A2A
- Primary/Active: #00D0BD (Cyan)
- Border: #404040
- Text Primary: #FFFFFF
- Text Secondary: #A0A0A0
- Text Tertiary: #666666
- Success: #22c55e
- Warning: #f59e0b
- Destructive: #ef4444

QUALITY: Crisp UI rendering, sharp text, professional app screenshot quality, mobile-optimized, pixel-perfect
```

**INSTAGRAM CAPTION:**
```
Your entire workout collection. Organized. Searchable. Always accessible. 📚💪

Never lose a good workout again.

With Kinex Fit Library:
✅ All your workouts in one place
✅ Search by name, type, or difficulty
✅ See how many times you've completed each
✅ Grid view for quick browsing
✅ Dark mode that's easy on the eyes 🌙

Import from Instagram. Generate with AI. Create manually.
Everything lives here.

Try free 👉 Link in bio

—

How many workouts do you have saved right now? 👇

—

#WorkoutLibrary #FitnessOrganization #WorkoutApp #FitnessApp #GymLife #DarkModeUI #WorkoutPlanner #TrainingLibrary #FitnessMotivation #WorkoutCollection #KinexFit #TrainingApp
```

---

## 📖 INSTAGRAM STORIES (1080×1920px Vertical)

### Story 1: Weekly Stats Overview

**NANO BANANA PRO PROMPT:**
```
Create a vertical Instagram Story image (1080x1920px) showing fitness stats with actual dark mode UI from Kinex Fit.

BACKGROUND: Deep dark gradient (#1A1A1A to #0A0A0A, vertical from top to bottom)

TOP SECTION (0-300px):
Text overlay: "My stats this week 📊" in white Inter Bold (64pt)
Centered, with subtle dark shadow for depth

STATS CARDS SECTION (300-1600px):
Four large stat cards stacked vertically with generous spacing:

Card spacing: 40px between each card
Card dimensions: 900px wide, 280px tall each

EACH CARD STRUCTURE:
- Background: Dark surface (#2A2A2A)
- Border radius: 16px
- Padding: 40px
- Shadow: 0 8px 24px rgba(0,0,0,0.5)
- Internal layout: Icon left, stats right

CARD 1 - Workouts:
Left: Dumbbell icon (cyan #00D0BD, 56px)
Right:
- Number: "12" in huge white Inter Bold (88pt)
- Label: "Workouts Completed" in gray (#A0A0A0, 22pt)

CARD 2 - Volume:
Left: Trending-Up icon (cyan #00D0BD, 56px)
Right:
- Number: "42,500" in huge white Inter Bold (72pt)
- Sublabel: "lbs" in gray (20pt)
- Label: "Total Volume This Week" in gray (22pt)

CARD 3 - Streak:
Left: Fire icon (orange #ff6b6b, 56px)
Right:
- Number: "8" in huge white Inter Bold (88pt)
- Label: "Current Streak (days)" in gray (22pt)

CARD 4 - PRs:
Left: Trophy icon (gold #fbbf24, 56px)
Right:
- Number: "3" in huge white Inter Bold (88pt)
- Label: "Personal Records Set" in gray (22pt)

BOTTOM SECTION (1600-1920px):
Dark overlay banner (#000000 at 85% opacity)
CTA text: "Track your progress too 👉" in white Inter (44pt)
Space for swipe-up link indicator or link sticker

COMPOSITION: Cards centered horizontally, consistent vertical spacing, balanced layout

STYLE: Clean dark UI, stat-focused design, mobile Instagram Story format, minimal and clear

TYPOGRAPHY: Inter Bold for numbers, Inter Regular for labels

ACTUAL COLORS:
- Background: #1A1A1A to #0A0A0A gradient
- Cards: #2A2A2A
- Primary: #00D0BD
- Text: #FFFFFF, #A0A0A0
- Orange: #ff6b6b
- Gold: #fbbf24

QUALITY: Sharp rendering, high contrast for mobile viewing, story-optimized
```

**STORY TEXT & STICKERS:**
```
TOP TEXT: "This week's stats 💪"

INTERACTIVE ELEMENTS:
- Poll sticker: "Are you tracking your workouts?"
  Options: "Yes" / "No"
- Link sticker: "Try Kinex Fit Free"
- Question sticker: "What's your current streak?"

BOTTOM CTA: "Tap to start tracking 👆"
```

---

## 🎬 INSTAGRAM REELS (1080×1920px Vertical Video)

### Reel 1: Workout Organization Before/After

**NANO BANANA PRO PROMPT (Cover Frame):**
```
Create an eye-catching Instagram Reel cover image (1080x1920px) showing POV of using Kinex Fit app on phone.

SUBJECT: First-person POV from above (45° angle) showing hands holding iPhone 15 Pro in space black

PHONE SCREEN:
Display actual Kinex Fit workout library with dark mode UI:
- Very dark background (#1A1A1A) visible
- Grid of workout cards showing (2×3 = 6 cards visible)
- Each card:
  * Dark surface (#2A2A2A)
  * 12px rounded corners
  * White workout titles
  * Cyan highlights (#00D0BD) on one card (tapped/selected)
- Clean, organized grid layout

HANDS:
Natural, relaxed grip on phone
Diverse skin tone representation
Realistic hand position
Thumbs visible, suggesting scrolling action

ENVIRONMENT/BACKGROUND:
Minimal dark surface (black marble or dark wood desk)
Workspace items softly blurred in background:
- Wireless earbuds (AirPods Pro) on left
- Water bottle edge visible on right
- Corner of dark notebook

LIGHTING:
Soft natural window light from left side (gentle side lighting)
Screen has bright glow contrasting with dark environment
Slight realistic lens flare
No harsh shadows

TEXT OVERLAY:
Top third: "POV:" in white Inter (48pt) with subtle shadow
Middle: "Finally organized 🙏" in white Inter Bold (64pt) with shadow
Bottom third: "All my workouts in one place ✨" in white Inter (36pt)

COMPOSITION:
- Hands and phone occupy center-third of frame
- Shallow depth of field (f/1.8 equivalent)
- Phone screen in sharp focus
- Background elements softly blurred (bokeh)

STYLE: POV lifestyle photography, relatable Instagram Reel aesthetic, authentic usage moment, dark theme showcase

CAMERA SIMULATION: iPhone 15 Pro Portrait Mode (35mm f/1.8 equivalent), natural color temperature (5500K), slight warm tint

QUALITY: Photorealistic lifestyle photography, professional influencer content quality, optimized for vertical mobile viewing

EXACT COLORS VISIBLE:
- App BG: #1A1A1A
- Cards: #2A2A2A
- Cyan Highlight: #00D0BD
- White Text: #FFFFFF
```

**REEL SCRIPT & CAPTION:**
```
REEL HOOK: "POV: You finally organized all your workouts 📱"

FRAME 1 (0-2 seconds):
Visual: Scrolling through messy iPhone camera roll filled with workout screenshots
Text overlay: "Before: Total chaos 😫"
Audio: Stressed/anxious music

FRAME 2 (2-4 seconds):
Visual: Opening Kinex Fit app
Text overlay: "Discovered Kinex Fit 💡"
Audio: Transition "aha" sound effect

FRAME 3 (4-8 seconds):
Visual: Smooth scrolling through organized dark mode workout library
Text overlay: "After: Everything organized ✨"
Audio: Satisfying, upbeat music

FRAME 4 (8-10 seconds):
Visual: Tapping on workout card to open
Text overlay: "Actually using them now 💪"

FRAME 5 (10-12 seconds):
Visual: Stats screen showing "24 workouts completed"
Text overlay: "And seeing results 📈"

FINAL FRAME (12-14 seconds):
Text: "Try free 👉 link in bio"
Kinex Fit logo

CAPTION FOR REEL POST:
"Stop losing workouts. Start making progress.

All your workouts organized in one dark mode app.

Link in bio 🔗

#FitnessApp #WorkoutOrganization #GymTok #FitTok #DarkMode #WorkoutApp #FitnessMotivation #GymLife #Organized #WorkoutLibrary #KinexFit"

AUDIO: Trending upbeat/satisfaction sound
```

---

## ✅ TECHNICAL SPECIFICATIONS

### Color Palette (Production Values)
```css
/* Must use exact hex values - do not approximate */
--primary: #00D0BD;           /* Cyan brand color */
--background: #1A1A1A;        /* Main dark background */
--surface: #2A2A2A;           /* Cards & elevated surfaces */
--surface-elevated: #3A3A3A;  /* Hover states */
--border: #404040;            /* UI borders */
--text-primary: #FFFFFF;      /* Main text */
--text-secondary: #A0A0A0;    /* Secondary text */
--text-tertiary: #666666;     /* Tertiary text */
--success: #22c55e;           /* Green success */
--warning: #f59e0b;           /* Orange warning */
--destructive: #ef4444;       /* Red error */
--accent: #FF6B6B;            /* Red accent */
```

### Typography System
- **Font:** Inter (Google Fonts)
- **Weights:** Regular (400), Medium (500), Semi-Bold (600), Bold (700)
- **Scale:** 10px, 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px, 36px, 44px, 52px, 64px, 72px
- **Line Height:** 1.5x for body, 1.2x for headings

### UI Component Specs
- **Card Radius:** 12px standard, 16px for large cards
- **Button Height:** 44px minimum (iOS touch target)
- **Input Height:** 44px minimum
- **Icon Sizes:** 16px (small), 20px (medium), 24px (large), 32px (XL)
- **Spacing Scale:** 4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px
- **Shadows:**
  - Soft: `0 2px 8px rgba(0,0,0,0.3)`
  - Medium: `0 4px 12px rgba(0,0,0,0.4)`
  - Hard: `0 8px 24px rgba(0,0,0,0.5)`

### Design Principles
✅ Dark mode only - no light mode variants
✅ Minimal, clean aesthetic - avoid clutter
✅ Card-based layouts for content organization
✅ Mobile-first responsive design
✅ Subtle gradients only - no heavy color gradients
✅ Cyan (#00D0BD) as primary accent color
✅ High contrast text for readability
✅ Rounded corners (12px standard)
✅ Lucide React icon library
✅ Inter font family throughout

---

**Document Version:** 2.0 (Actual UI Review)
**Last Updated:** January 12, 2026
**Based On:** Production Kinex Fit Web App (c:\spot-buddy-web)
**Reviewed:** Frontend source code, Tailwind config, global styles
**Optimized For:** Google Gemini 3 Pro Image (Nano Banana Pro)
**Format:** Instagram Marketing (Feed Posts, Stories, Reels)
