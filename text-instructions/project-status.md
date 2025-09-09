# Spotter App - Workout Processing Status

## Project Overview
Transitioning from AI-powered workout processing to a simpler, user-controlled workout builder. The system will allow users to import Instagram workout posts, manually build workouts from captions, and save structured workout data.

## ✅ Completed Features

### 1. **Instagram Integration (Complete)**
- **Apify Integration**: Instagram URL fetching with workout caption extraction
- **Clean Caption Parsing**: Basic workout pattern recognition for initial structure
- **Error Handling**: Graceful fallbacks and user-friendly error messages

### 2. **Current User Workflow (Complete)**
- **Import Flow**: Instagram URL → Fetch content → Manual workout building → Save → Display
- **Loading States**: Loading animations for Instagram fetching
- **Error Handling**: Basic error handling for failed Instagram fetches

### 3. **UI Components (Complete)**
- **Import Page**: Multi-tab interface (URL/Image/Manual)
- **Edit Page**: Structured exercise table with inline editing capabilities
- **View Page**: Complete workout display
- **Dark Theme**: All components match platform design language

### 4. **Data Structure (Complete)**
- **Exercise Format**: Structured with movement, sets, reps, weight, restSeconds, notes
- **Storage**: SessionStorage for temporary data, LocalStorage for persistence
- **Navigation**: Complete flow between all pages

## 🛠️ Technical Implementation

### **File Structure**
```
spotter-free/
  ├── src/
  │   ├── app/
  │   │   ├── add/page.tsx (Import page)
  │   │   ├── add/edit/page.tsx (Exercise editing interface)
  │   │   ├── workout/[id]/page.tsx (Workout display)
  │   │   ├── api/instagram-fetch/route.ts (Instagram fetching)
  │   ├── components/ui/
  │   │   └── loading-spinner.tsx (Loading animations)
  │   └── lib/editable-workout-table.tsx (Exercise table component)
```

### **Current Server Status**
- **Running on**: `localhost:3000` (default Next.js port)
- **Status**: ✅ Clean - No Jest worker errors
- **APIs**: Instagram fetch functional, AI processing to be removed
- **Environment**: `.env.local` configured with Apify token

## 📊 What's Working Now

### **Core Functionality**
1. **Instagram Import**: 
   - Paste Instagram URL → Auto-fetch content
   - Basic caption parsing for exercise detection
   - Real-time loading indicators

2. **Manual Workout Building** (NEW APPROACH):
   - Each line from Instagram caption becomes a table row
   - Users manually remove unwanted lines
   - Users manually structure exercises (sets, reps, etc.)
   - Simple, user-controlled workflow

3. **Exercise Editing**:
   - Inline editing of all exercise fields
   - Add/remove/duplicate exercises
   - Manual entry for movements and weights

4. **Data Persistence**:
   - Saves to localStorage as complete workout objects
   - No AI metadata, simple source tracking

## 🔧 Required Changes

### **🚨 HIGH PRIORITY - Remove AI Implementation**
1. **Remove AI Processing**:
   - Delete `/api/ingest/route.ts` (OpenAI processing endpoint)
   - Remove `lib/llm/` folder (repair.ts, router.ts, tools.ts)
   - Remove `llm-processing.tsx` component
   - Remove OpenAI environment variables

2. **Update Import Flow**:
   - Remove AI processing calls from import page
   - Implement simple line-by-line caption parsing
   - Each caption line becomes an editable table row

### **🛠️ BUILD OUT - Simple Workout Builder**
1. **Caption-to-Table Logic**:
   - Split Instagram caption into individual lines
   - Filter out hashtags, mentions, emojis (optional)
   - Present each line as an editable table row
   - Allow users to delete unwanted rows

2. **Manual Exercise Structuring**:
   - Users manually fill in sets, reps, weight columns
   - Simple dropdown suggestions for common exercises
   - No AI processing - pure user input

3. **Save Workflow**:
   - Save manually created workouts to library
   - Include source Instagram URL for reference

## 🎯 Implementation Tasks

### **🚨 IMMEDIATE - Remove AI (Required)**
1. **Remove AI Implementation**:
   - Delete AI processing endpoint and LLM folder
   - Remove OpenAI dependencies from package.json
   - Clean up AI-related UI components
   - Update environment variable requirements

2. **Build Simple Workout Builder**:
   - Create line-by-line caption parser
   - Build table interface for manual exercise entry
   - Implement row deletion functionality
   - Create save-to-library workflow

### **Future Features (Lower Priority)**
1. **Enhanced Manual Builder**:
   - Exercise name suggestions/autocomplete
   - Common weight/rep templates
   - Workout categories and tags

2. **Additional Sources**:
   - Manual text paste input
   - Image OCR (non-AI based)
   - Template-based workout creation

## 🗂️ File Locations

### **Key Configuration Files**
- **Environment**: `spotter-free/.env.local` (Apify API token only)
- **Instagram Parser**: `src/app/api/instagram-fetch/route.ts` (Keep)
- **Workout Builder**: `src/lib/editable-workout-table.tsx` (Update)

### **Files to Remove**
- `src/app/api/ingest/route.ts` (AI processing)
- `src/lib/llm/` (entire folder)
- `src/components/ui/llm-processing.tsx`
- OpenAI dependencies in package.json

### **Files to Update**
- `src/app/add/page.tsx` (remove AI calls)
- `src/app/add/edit/page.tsx` (simple manual builder)

## 🚀 Current State

**TRANSITION REQUIRED** - Moving from AI to manual approach:
- ✅ Instagram URL fetching functional
- ❌ AI processing needs removal
- ✅ Basic UI structure in place
- ❌ Manual workout builder needs implementation
- ✅ Data persistence working

**Next Steps**: Remove AI dependencies and implement simple workout builder.

## 🔄 Development Plan

### **Phase 1: Remove AI (Critical)**
1. **Clean Removal**: Delete AI files and dependencies
2. **Update Import Flow**: Remove AI processing calls
3. **Test**: Ensure Instagram fetching still works

### **Phase 2: Build Manual Workflow**
1. **Caption Parser**: Split lines into table rows
2. **Row Management**: Add/delete row functionality
3. **Manual Input**: User-controlled exercise structuring
4. **Save Flow**: Persist manually created workouts

### **Phase 3: Polish**
1. **UI Cleanup**: Remove AI badges and indicators
2. **User Testing**: Validate manual workflow
3. **Documentation**: Update setup instructions

**Goal**: Simple, user-controlled workout builder without AI complexity.