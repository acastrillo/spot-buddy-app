# Scout Usage Guide - Token Optimization

**Purpose**: Use `/scout` to offload expensive operations to specialized agents, saving Claude Code's token budget for actual coding work.

---

## 🎯 When to Use Scout vs. Direct Tools

### ✅ USE SCOUT (Save Tokens)

Use `/scout` for these expensive operations:

#### 1. **Multi-File Searches** (High Token Cost)
Instead of using Grep + Read across many files, use scout:

```bash
# ❌ DON'T (High token usage):
Grep pattern → Read 10+ files → Analyze all

# ✅ DO (Low token usage):
/scout "Find all files that use the useAuthStore hook" 3

# Saves: 50-100k tokens per search
```

#### 2. **Architecture Understanding** (Very High Token Cost)
Understanding large codebases consumes massive tokens:

```bash
# ❌ DON'T:
Read 20 files to understand auth flow

# ✅ DO:
/scout "Explain the authentication flow from login to API calls" 5

# Saves: 100-200k tokens
```

#### 3. **Finding Examples/Patterns** (High Token Cost)
Looking for code patterns across the codebase:

```bash
# ❌ DON'T:
Grep + Read multiple files for examples

# ✅ DO:
/scout "Find all API routes that use rate limiting" 3
/scout "Show me examples of useMemo usage" 2

# Saves: 30-80k tokens per search
```

#### 4. **Bug Hunting** (Very High Token Cost)
Searching for potential issues across many files:

```bash
# ❌ DON'T:
Read every file looking for issues

# ✅ DO:
/scout "Find all places where we use 'as any' type casts" 4
/scout "Look for unhandled promise rejections" 4

# Saves: 80-150k tokens
```

#### 5. **Dependency Tracking** (High Token Cost)
Finding where things are used:

```bash
# ✅ USE SCOUT:
/scout "Where is dynamoDBWorkouts.upsert called?" 3
/scout "Find all components that call the /api/workouts endpoint" 4

# Saves: 40-100k tokens
```

---

### ❌ DON'T USE SCOUT (Use Direct Tools)

#### 1. **Reading Specific Known Files** (Low Token Cost)
When you know exactly which file to read:

```bash
# ✅ DO (Direct):
Read src/lib/api-auth.ts

# ❌ DON'T USE SCOUT (Wastes time):
/scout "Show me the api-auth.ts file" 1
```

#### 2. **Single File Edits** (Low Token Cost)
When you're already looking at a file:

```bash
# ✅ DO (Direct):
Edit src/app/api/workouts/route.ts

# ❌ DON'T USE SCOUT
```

#### 3. **Simple Glob Searches** (Low Token Cost)
Finding files by name pattern:

```bash
# ✅ DO (Direct):
Glob **/api/**/route.ts

# ❌ DON'T USE SCOUT (Overkill)
```

#### 4. **Code You Just Wrote** (Low Token Cost)
Context you already have:

```bash
# ✅ DO (Direct):
Use information from recent conversation

# ❌ DON'T USE SCOUT
```

---

## 📊 Token Savings Examples

### Example 1: Finding Auth Usage

**Without Scout** (High Token Cost):
```
1. Grep "getServerSession" → 15 files found
2. Read all 15 files → 150k tokens
3. Analyze each file → 50k tokens
Total: ~200k tokens
```

**With Scout** (Low Token Cost):
```
/scout "Find all API routes using getServerSession" 3

Scout spawns 3 Gemini agents → 5k tokens
Returns summary → 2k tokens
Total: ~7k tokens

Savings: 193k tokens (96% reduction!)
```

### Example 2: Understanding Component Structure

**Without Scout**:
```
1. Read 20 component files → 200k tokens
2. Read imports/exports → 30k tokens
3. Analyze relationships → 40k tokens
Total: ~270k tokens
```

**With Scout**:
```
/scout "Map out the component hierarchy in src/components" 6

Scout uses 6 Explore agents → 10k tokens
Returns organized summary → 3k tokens
Total: ~13k tokens

Savings: 257k tokens (95% reduction!)
```

### Example 3: Finding Security Issues

**Without Scout**:
```
1. Grep various patterns → 20k tokens
2. Read 30+ files → 300k tokens
3. Analyze each → 80k tokens
Total: ~400k tokens
```

**With Scout**:
```
/scout "Review entire codebase for security issues" 10

Scout spawns 10 agents → 15k tokens
Returns prioritized list → 5k tokens
Total: ~20k tokens

Savings: 380k tokens (95% reduction!)
```

---

## 🎓 Best Practices

### 1. **Use Appropriate Scale**

Match the scale to task complexity:

```bash
# Simple searches (1-3 agents)
/scout "Find the auth utility file" 1
/scout "Where is checkRateLimit imported?" 2

# Medium searches (4-5 agents)
/scout "Find all rate-limited API routes" 4
/scout "Show me all DynamoDB operations" 4

# Complex searches (6+ agents)
/scout "Review codebase for performance issues" 8
/scout "Map entire API route structure" 10
```

### 2. **Be Specific in Prompts**

Better prompts = better results = fewer follow-ups:

```bash
# ❌ Vague (may need follow-up):
/scout "Find auth stuff" 3

# ✅ Specific (one-shot):
/scout "Find all API routes that use getAuthenticatedUserId from api-auth.ts" 3
```

### 3. **Batch Related Searches**

Group related questions into one scout:

```bash
# ❌ Multiple scouts (wastes tokens):
/scout "Find rate limit code" 2
/scout "Find auth code" 2
/scout "Find quota code" 2

# ✅ One comprehensive scout:
/scout "Find all security-related code: rate limiting, auth, and quota management" 5
```

### 4. **Use Scout for Discovery, Direct Tools for Implementation**

```bash
# Phase 1: Discovery (use scout)
/scout "Find all places we need to add rate limiting" 4

# Phase 2: Implementation (use direct tools)
Read src/app/api/workouts/route.ts
Edit src/app/api/workouts/route.ts
# ... make changes
```

---

## 🚀 Real-World Workflows

### Workflow 1: Adding a New Feature

**Step 1**: Scout for examples
```bash
/scout "Find similar features to rate limiting implementation" 4
```

**Step 2**: Use direct tools to implement
```bash
Read src/lib/rate-limit.ts
# Copy pattern, adapt to new feature
Write src/lib/new-feature.ts
```

### Workflow 2: Refactoring

**Step 1**: Scout to find all usages
```bash
/scout "Find everywhere we use the old auth pattern" 5
```

**Step 2**: Use direct tools to refactor
```bash
Read [file1]
Edit [file1]
Read [file2]
Edit [file2]
# ... etc
```

### Workflow 3: Debugging

**Step 1**: Scout to narrow down issue
```bash
/scout "Find all error handling in API routes" 4
```

**Step 2**: Use direct tools to fix
```bash
Read [problematic-file]
Edit [problematic-file]
```

### Workflow 4: Understanding Legacy Code

**Step 1**: Scout for architecture overview
```bash
/scout "Explain how workouts are stored and retrieved" 6
```

**Step 2**: Read specific files as needed
```bash
Read src/lib/dynamodb.ts
Read src/app/api/workouts/route.ts
```

---

## 📈 Token Budget Management

### Typical Claude Code Session: 200k tokens

**Without Scout**:
- 20k tokens: Initial context
- 100k tokens: Reading/searching files
- 50k tokens: Analysis
- 30k tokens: Code generation
- **Total: 200k (Hit limit quickly!)**

**With Scout**:
- 20k tokens: Initial context
- 10k tokens: Scout searches (90k saved!)
- 50k tokens: Analysis
- 30k tokens: Code generation
- **90k tokens remaining for more work!**

### Token-Efficient Session Example

```bash
# Start of session (20k tokens)
User: "Add rate limiting to all API routes"

# Use scout for discovery (7k tokens)
/scout "Find all API routes that need rate limiting" 4

# Use direct tools for implementation (30k tokens)
Read src/app/api/workouts/route.ts
Edit src/app/api/workouts/route.ts
Read src/app/api/upload/route.ts
Edit src/app/api/upload/route.ts

# Use scout for testing (5k tokens)
/scout "Find all rate limit test cases" 2

# Total: 62k tokens (138k remaining!)
```

---

## 🎯 Quick Reference

### Always Use Scout For:
- ✅ Multi-file searches
- ✅ Architecture understanding
- ✅ Finding usage patterns
- ✅ Security audits
- ✅ Performance reviews
- ✅ Dependency tracking
- ✅ Bug hunting across codebase

### Never Use Scout For:
- ❌ Reading specific known files
- ❌ Single file edits
- ❌ Simple glob searches
- ❌ Information already in context

### Token Savings:
- **Small scout**: Saves 30-50k tokens
- **Medium scout**: Saves 80-150k tokens
- **Large scout**: Saves 200-400k tokens

---

## 💡 Pro Tips

### 1. **Scout First, Code Later**
Start with scout to understand the codebase, then use direct tools to make changes.

### 2. **Chain Scouts for Complex Tasks**
Break complex tasks into multiple focused scouts:
```bash
/scout "Find all auth-related files" 3
# Review results
/scout "Find security issues in auth files" 4
```

### 3. **Use Scout Results as Documentation**
Scout outputs are saved to `plans/scouts/` - reference them later without re-running!

### 4. **Scale Matters**
Don't use scale 10 for simple searches - it's overkill and slower.

### 5. **Combine with Grep for Known Patterns**
Use Grep for exact string matches, Scout for semantic understanding:
```bash
# Known string
Grep "TODO:"

# Understanding context
/scout "Find all unfinished features marked with TODO" 3
```

---

## 📚 Common Scout Patterns

```bash
# Finding implementations
/scout "How is user authentication implemented?" 5
/scout "Where do we validate file uploads?" 3

# Finding usages
/scout "Where is dynamoDBUsers.incrementCounter used?" 3
/scout "Which components call the /api/workouts endpoint?" 4

# Security reviews
/scout "Find potential SQL injection vulnerabilities" 6
/scout "Review all API routes for missing auth checks" 8

# Performance reviews
/scout "Find expensive operations in React components" 6
/scout "Locate database queries that could be optimized" 5

# Architecture understanding
/scout "Explain the data flow from UI to database" 7
/scout "Map out all API routes and their purposes" 8

# Refactoring prep
/scout "Find all places using the old quota pattern" 4
/scout "Locate duplicate code that could be extracted" 6
```

---

## 🎉 Summary

**Key Takeaway**: Use `/scout` for discovery and exploration, use direct tools for implementation.

**Token Savings**: 50-95% reduction in token usage for search/discovery tasks

**Best For**:
- Multi-file operations
- Architecture understanding
- Finding patterns/examples
- Security/performance reviews

**Not For**:
- Reading specific files you already know
- Simple file operations
- Information already in context

**Result**: More coding, less token waste! 🚀
