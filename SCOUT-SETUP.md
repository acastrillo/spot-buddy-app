# Scout System Setup Guide

## Overview

The `/scout` command uses multi-agent search to efficiently explore the codebase based on task complexity.

## Installation Status ✅

- **Gemini CLI**: v0.10.0 (installed)
- **OpenCode CLI**: v0.15.14 (installed)
- **Output Directory**: `plans/scouts/` (created)
- **Slash Command**: `.claude/commands/scout.md` (created)

## Authentication Setup

### 1. Gemini CLI Authentication

**Option A: Google Sign-In (Free Tier - Recommended)**
- 60 requests/min, 1,000 requests/day
- Run: `gemini` (first launch will prompt for Google sign-in)
- Follow browser authentication flow

**Option B: API Key (Higher Limits)**
```bash
# Get API key from: https://aistudio.google.com/app/apikey
export GEMINI_API_KEY="your-api-key-here"
```

### 2. OpenCode CLI Authentication

**Setup Steps:**
```bash
# Login to OpenCode
opencode auth login

# Select model provider
# Navigate to: https://opencode.ai/auth
# Sign in and add billing details
# Copy API key and paste when prompted
```

**Free Tier:**
- Grok Code Fast 1 is FREE for limited time via OpenCode partnership

### 3. Verify Setup

Test each CLI to ensure authentication works:

```bash
# Test Gemini
gemini -p "List files in src/app" --model gemini-2.5-flash-preview-09-2025

# Test OpenCode
opencode run "List files in src/app" --model xai/grok-code-fast-1
```

## Usage Examples

### Basic Search (Scale 1-3)
```
/scout "Find all authentication code" 2
```
Uses 2 Gemini agents in parallel

### Moderate Search (Scale 4-5)
```
/scout "Locate workout parsing logic and DynamoDB operations" 4
```
Uses 4 Grok Code agents

### Comprehensive Search (Scale 6+)
```
/scout "Map the entire authentication flow from login to session management" 8
```
Uses 8 native Explore agents

## How It Works

1. **Scale 1-3**: Gemini 2.5 Flash (fast, efficient for simple queries)
2. **Scale 4-5**: Grok Code Fast 1 (moderate complexity, good for multi-file searches)
3. **Scale 6+**: Native Explore agents (comprehensive, deep codebase analysis)

## Output Location

All scout results are saved to:
```
plans/scouts/scout-[timestamp].md
```

## Cost Considerations

- **Gemini Free Tier**: 1,000 requests/day (sufficient for most use cases)
- **OpenCode Free**: Grok Code Fast 1 is currently FREE (limited time offer)
- **Native Explore**: Always free (uses Claude's existing capabilities)

## Troubleshooting

### Gemini Not Authenticated
```bash
gemini  # Launch interactive mode to trigger auth flow
```

### OpenCode Not Authenticated
```bash
opencode auth login
# Follow prompts to authenticate
```

### Check Installed Versions
```bash
gemini --version    # Should show 0.10.0+
opencode --version  # Should show 0.15.14+
```

## Next Steps

1. **Authenticate Gemini**: Run `gemini` and sign in with Google
2. **Authenticate OpenCode**: Run `opencode auth login` and follow setup
3. **Test Scout**: Try `/scout "Find auth code" 2` to verify it works
4. **Explore**: Use different scale levels to find optimal performance

## Tips

- Start with **scale 2-3** for most searches
- Use **scale 4-5** when you need to search multiple subsystems
- Use **scale 6+** only for comprehensive codebase mapping (slower but thorough)
- Results are cached in `plans/scouts/` for reference

---

**Status**: Setup complete! Authenticate CLIs and start scouting. 🚀
