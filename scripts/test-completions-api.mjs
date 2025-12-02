/**
 * Test Workout Completions API
 *
 * This script tests all the new completions API endpoints to ensure
 * they work correctly with DynamoDB.
 *
 * Prerequisites:
 * 1. Dev server running (npm run dev) OR production URL
 * 2. Valid session token
 *
 * Usage: node scripts/test-completions-api.mjs
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function section(message) {
  log(`\n${"=".repeat(60)}`, colors.blue);
  log(`${message}`, colors.blue);
  log(`${"=".repeat(60)}`, colors.blue);
}

// Test data
const testWorkoutId = "test-workout-" + Date.now();
const testCompletions = [];

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message,
    };
  }
}

async function testCreateCompletion() {
  section("TEST 1: Create Workout Completion");

  const completionData = {
    workoutId: testWorkoutId,
    completedAt: new Date().toISOString(),
    completedDate: new Date().toISOString().split("T")[0],
    durationSeconds: 1800, // 30 minutes
    durationMinutes: 30,
    notes: "Test completion from API test script",
  };

  info(`Creating completion for workout: ${testWorkoutId}`);
  info(`Duration: 30 minutes`);

  const result = await makeRequest("/api/workouts/completions", {
    method: "POST",
    body: JSON.stringify(completionData),
  });

  if (result.ok && result.data.success) {
    success("Completion created successfully!");
    testCompletions.push(result.data.completion);
    console.log("  Completion ID:", result.data.completion.completionId);
    console.log("  Workout ID:", result.data.completion.workoutId);
    console.log("  Duration:", result.data.completion.durationMinutes, "minutes");
    return true;
  } else {
    error("Failed to create completion");
    console.log("  Response:", result.data);
    return false;
  }
}

async function testListCompletions() {
  section("TEST 2: List All Completions");

  info("Fetching all completions...");

  const result = await makeRequest("/api/workouts/completions");

  if (result.ok && result.data.completions) {
    success(`Retrieved ${result.data.completions.length} completions`);

    if (result.data.completions.length > 0) {
      console.log("\n  Recent completions:");
      result.data.completions.slice(0, 3).forEach((comp, idx) => {
        console.log(`    ${idx + 1}. ${comp.completedDate} - ${comp.workoutId.substring(0, 20)}...`);
      });
    }
    return true;
  } else {
    error("Failed to list completions");
    console.log("  Response:", result.data);
    return false;
  }
}

async function testGetStats() {
  section("TEST 3: Get Workout Statistics");

  info("Fetching workout stats...");

  const result = await makeRequest("/api/workouts/completions/stats");

  if (result.ok && result.data.stats) {
    success("Stats retrieved successfully!");
    const stats = result.data.stats;
    console.log("\n  📊 Your Stats:");
    console.log(`    This Week: ${stats.thisWeek} workouts`);
    console.log(`    Total: ${stats.total} workouts`);
    console.log(`    Streak: ${stats.streak} days`);
    console.log(`    Hours Trained: ${stats.hoursTrained} hours`);
    return true;
  } else {
    error("Failed to get stats");
    console.log("  Response:", result.data);
    return false;
  }
}

async function testGetCompletionsForWorkout() {
  section("TEST 4: Get Completions for Specific Workout");

  if (testCompletions.length === 0) {
    log("⚠️  Skipping - no test completions created", colors.yellow);
    return true;
  }

  const workoutId = testCompletions[0].workoutId;
  info(`Fetching completions for workout: ${workoutId}`);

  const result = await makeRequest(`/api/workouts/${workoutId}/completions`);

  if (result.ok && result.data.completions !== undefined) {
    success(`Found ${result.data.count} completion(s) for this workout`);
    console.log("  Workout ID:", result.data.workoutId);
    return true;
  } else {
    error("Failed to get workout completions");
    console.log("  Response:", result.data);
    return false;
  }
}

async function testQueryWithFilters() {
  section("TEST 5: Query with Filters");

  const today = new Date().toISOString().split("T")[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  info(`Querying completions from ${lastWeek} to ${today}`);

  const result = await makeRequest(
    `/api/workouts/completions?startDate=${lastWeek}&endDate=${today}`
  );

  if (result.ok && result.data.completions) {
    success(`Found ${result.data.completions.length} completions in date range`);
    return true;
  } else {
    error("Failed to query with filters");
    console.log("  Response:", result.data);
    return false;
  }
}

async function testValidation() {
  section("TEST 6: API Validation");

  info("Testing missing required fields...");

  const result = await makeRequest("/api/workouts/completions", {
    method: "POST",
    body: JSON.stringify({
      // Missing workoutId, completedAt, completedDate
      durationSeconds: 1800,
    }),
  });

  if (!result.ok && result.status === 400) {
    success("Validation working correctly (rejected invalid request)");
    return true;
  } else {
    error("Validation failed - accepted invalid request");
    return false;
  }
}

async function runTests() {
  log("\n🧪 Testing Workout Completions API", colors.blue);
  log(`   Base URL: ${BASE_URL}\n`, colors.blue);

  const tests = [
    { name: "Create Completion", fn: testCreateCompletion },
    { name: "List Completions", fn: testListCompletions },
    { name: "Get Statistics", fn: testGetStats },
    { name: "Get Workout Completions", fn: testGetCompletionsForWorkout },
    { name: "Query with Filters", fn: testQueryWithFilters },
    { name: "API Validation", fn: testValidation },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      error(`Test "${test.name}" threw an error: ${err.message}`);
      failed++;
    }
  }

  // Summary
  section("TEST SUMMARY");
  log(`Total Tests: ${tests.length}`, colors.cyan);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);

  if (failed === 0) {
    success("\n🎉 All tests passed!");
  } else {
    error(`\n⚠️  ${failed} test(s) failed. Check the output above for details.`);
  }

  log("\n💡 Tips:", colors.yellow);
  log("   - Make sure you're authenticated (logged in)");
  log("   - Check that DynamoDB table exists and has correct permissions");
  log("   - Verify environment variables are set correctly");
  log("   - Check CloudWatch logs for server-side errors\n");
}

// Run tests
runTests().catch((err) => {
  error("Fatal error running tests:");
  console.error(err);
  process.exit(1);
});
