# Spotter Usage Guide

Welcome to Spotter! This guide will help you get started with tracking your workouts and making the most of the app's features.

## Table of Contents

- [Getting Started](#getting-started)
- [Creating an Account](#creating-an-account)
- [Adding Workouts](#adding-workouts)
- [Managing Your Workout Library](#managing-your-workout-library)
- [Viewing Workout Details](#viewing-workout-details)
- [Editing Workouts](#editing-workouts)
- [Tips & Best Practices](#tips--best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing Spotter

Visit [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com) in your web browser.

**Supported Browsers**:
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Devices**:
- Desktop computers
- Laptops
- Tablets
- Mobile phones

## Creating an Account

### Sign Up with Google

1. Click **"Login"** in the navigation bar
2. You'll be redirected to the Spotter login page
3. Click **"Sign in with Google"**
4. Choose your Google account
5. Grant permissions to Spotter
6. You'll be automatically logged in and redirected to the home page

### Account Features

Your account includes:
- **Cross-device sync**: Access your workouts from any device
- **Secure cloud storage**: Your workouts are safely stored in AWS
- **Free tier**: 2 OCR requests per week for image-based workouts

## Adding Workouts

### Method 1: Add from Instagram

1. Navigate to **"Add Workout"** in the menu
2. Paste an Instagram post URL containing a workout
3. Click **"Fetch & Parse"**
4. Spotter will extract the workout details automatically
5. Review the parsed exercises
6. Click **"Save"** to add to your library

**Supported Instagram Content**:
- Workout posts with exercise descriptions
- Text-based workout routines
- Posts with hashtags like #workout, #fitness

### Method 2: Upload Image with OCR

1. Navigate to **"Add Workout"**
2. Click **"Upload Image"**
3. Select a screenshot or photo of a workout
4. Spotter will use OCR to extract text from the image
5. Review and edit the extracted workout
6. Click **"Save"**

**OCR Tips**:
- Use clear, high-resolution images
- Ensure text is legible and not blurry
- Avoid images with complex backgrounds
- Free tier: 2 OCR requests per week

### Method 3: Manual Entry

1. Navigate to **"Add Workout"**
2. Fill in workout details:
   - **Title**: Give your workout a name
   - **Description**: Add notes or context (optional)
   - **Exercises**: Add exercises manually
3. For each exercise, enter:
   - Exercise name (e.g., "Bench Press")
   - Sets (e.g., 3)
   - Reps (e.g., "10-12")
   - Rest period (e.g., "60s")
   - Tempo (optional, e.g., "3-1-1")
   - Notes (optional)
4. Click **"Add Exercise"** to add more exercises
5. Click **"Save"** to add to your library

## Managing Your Workout Library

### Viewing All Workouts

1. Click **"Library"** in the navigation bar
2. You'll see a grid of all your saved workouts
3. Each card shows:
   - Workout title
   - Number of exercises
   - Total duration
   - Difficulty level
   - Tags

### Searching Workouts

1. Use the search bar at the top of the library
2. Search by:
   - Workout title
   - Exercise names
   - Tags
   - Author username

### Filtering Workouts

Future feature: Filter by difficulty, duration, muscle groups, or tags.

### Sorting Workouts

Current sort order: Most recently created first

Future options: Sort by date, title, difficulty, or duration.

## Viewing Workout Details

1. Click on any workout card in your library
2. The workout detail page shows:
   - Full workout title and description
   - List of exercises with sets, reps, rest periods
   - Total workout duration
   - Difficulty level
   - Source (Instagram, OCR, manual)
   - Creation date

### Exercise Details

Each exercise displays:
- **Name**: Exercise name
- **Sets**: Number of sets to perform
- **Reps**: Rep range or count
- **Rest**: Rest period between sets
- **Tempo**: Lifting tempo (optional)
- **Notes**: Additional instructions (optional)

## Editing Workouts

### Edit Workout Details

1. Open the workout from your library
2. Click **"Edit"** button
3. Modify any field:
   - Title
   - Description
   - Exercise details
4. Click **"Save"** to update

### Add or Remove Exercises

1. In edit mode, scroll to the exercise list
2. Click **"Add Exercise"** to add new exercises
3. Click the **delete icon** next to an exercise to remove it
4. Reorder exercises by dragging (future feature)

### Delete Workout

1. Open the workout from your library
2. Click **"Delete"** button
3. Confirm deletion
4. Workout will be permanently removed

**Note**: Deletion cannot be undone. Make sure you want to delete before confirming.

## Tips & Best Practices

### Organizing Your Workouts

- **Use descriptive titles**: "Upper Body Strength - Day 1" is better than "Workout 1"
- **Add tags**: Tag workouts by muscle group, difficulty, or training style
- **Include notes**: Add context about weight used, how you felt, or modifications

### Maximizing OCR Accuracy

- Take clear, well-lit photos
- Crop images to focus on workout text only
- Use screenshots from workout apps for best results
- Review OCR output carefully before saving

### Instagram Workouts

- Save the Instagram URL before the post is deleted
- Credit the original creator in workout notes
- Verify exercise details for accuracy

### Cross-Device Usage

- Log in on all your devices for automatic sync
- Changes sync in real-time across devices
- Works offline with automatic sync when reconnected

### Workout Planning

- Create workouts in advance for the week
- Use the calendar view to schedule workouts (coming soon)
- Track progress by logging weights and reps (coming soon)

## Troubleshooting

### Login Issues

**Problem**: Can't log in with Google

**Solutions**:
- Clear browser cache and cookies
- Try incognito/private browsing mode
- Ensure pop-ups are not blocked
- Check if you're using the correct Google account

---

**Problem**: Logged out unexpectedly

**Solutions**:
- Sessions expire after 30 days
- Log in again to continue
- Check browser cookie settings

### Workout Not Saving

**Problem**: Workout doesn't appear in library after saving

**Solutions**:
- Ensure you're logged in
- Check internet connection
- Refresh the library page
- Try saving again

---

**Problem**: Changes not syncing across devices

**Solutions**:
- Verify you're logged in on both devices
- Wait a few seconds for sync to complete
- Refresh the page
- Check internet connection

### OCR Not Working

**Problem**: OCR fails to extract text from image

**Solutions**:
- Check OCR quota (2 per week on free tier)
- Try a clearer image
- Ensure image size is under 10 MB
- Use a different image format (JPG, PNG)

---

**Problem**: OCR extracts incorrect text

**Solutions**:
- Review and edit the extracted text manually
- Use a higher resolution image
- Crop image to focus on workout text only

### Instagram Import Issues

**Problem**: Instagram fetch fails

**Solutions**:
- Verify the Instagram URL is correct
- Ensure the post is public
- Check if post contains workout text
- Try copying the URL again

---

**Problem**: Workout text not parsed correctly

**Solutions**:
- Edit the parsed workout manually
- Try a different Instagram post format
- Report the issue for parser improvements

### Performance Issues

**Problem**: App is slow or unresponsive

**Solutions**:
- Refresh the page
- Clear browser cache
- Close other browser tabs
- Check internet connection
- Try a different browser

---

**Problem**: Images not loading

**Solutions**:
- Check internet connection
- Refresh the page
- Clear browser cache

## Getting Help

### Support Channels

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check README.md and ARCHITECTURE.md for technical details

### Feature Requests

We welcome feature suggestions! Please open a GitHub issue with:
- Clear description of the feature
- Use case or problem it solves
- Any relevant screenshots or mockups

### Bug Reports

When reporting bugs, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior vs. actual behavior
- Browser and device information
- Screenshots if applicable

---

## What's Next?

### Upcoming Features

- **Calendar View**: Schedule workouts by date
- **Progress Tracking**: Log weights, reps, and track improvements
- **Workout Timers**: Built-in interval timers
- **Social Features**: Connect with friends and share workouts
- **Mobile App**: Native iOS and Android apps
- **Apple Health Sync**: Connect with health data and wearables

Stay tuned for updates!

---

**Last Updated**: January 2025
**App Version**: 1.0
**Production URL**: [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com)
