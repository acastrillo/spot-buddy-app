#!/usr/bin/env node
/**
 * Rate Limit Testing Script
 *
 * Tests all API endpoints with rate limiting to ensure they work correctly.
 *
 * Usage:
 *   node scripts/test-rate-limits.mjs
 *
 * Prerequisites:
 *   1. Dev server running (npm run dev)
 *   2. Upstash Redis configured in .env.local
 *   3. Valid session cookie (login via browser first)
 *
 * What it tests:
 *   - OCR endpoint (10 req/hour)
 *   - Instagram endpoint (20 req/hour)
 *   - Workouts GET endpoint (100 req/minute)
 *   - Workouts POST endpoint (50 req/minute)
 *   - Upload endpoint (20 req/hour)
 *   - AI enhance endpoint (30 req/hour)
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:3000';
const SESSION_COOKIE_FILE = '.session-cookie'; // Store session cookie here

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

/**
 * Get session cookie from file or prompt user
 */
function getSessionCookie() {
  if (fs.existsSync(SESSION_COOKIE_FILE)) {
    const cookie = fs.readFileSync(SESSION_COOKIE_FILE, 'utf-8').trim();
    if (cookie) {
      logInfo('Using stored session cookie');
      return cookie;
    }
  }

  logWarning('No session cookie found!');
  logInfo('Please follow these steps:');
  logInfo('1. Open http://localhost:3000 in your browser');
  logInfo('2. Login to your account');
  logInfo('3. Open DevTools (F12) → Application → Cookies');
  logInfo('4. Copy the value of "next-auth.session-token" cookie');
  logInfo('5. Create a file called .session-cookie in the root directory');
  logInfo('6. Paste the cookie value into that file');
  logInfo('7. Run this script again');
  process.exit(1);
}

/**
 * Make authenticated request
 */
async function makeRequest(endpoint, options = {}) {
  const sessionCookie = getSessionCookie();
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Cookie': `next-auth.session-token=${sessionCookie}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
      retryAfter: response.headers.get('Retry-After'),
    },
  };
}

/**
 * Test a specific endpoint with rate limiting
 */
async function testRateLimit(config) {
  const { name, endpoint, method = 'GET', body, limit, description } = config;

  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`Testing: ${name}`, colors.blue);
  log(`Endpoint: ${endpoint}`, colors.cyan);
  log(`Expected Limit: ${limit} requests`, colors.cyan);
  log(`Description: ${description}`, colors.cyan);
  log('='.repeat(60), colors.blue);

  const results = {
    passed: 0,
    failed: 0,
    blocked: 0,
  };

  // Make requests up to limit + 1
  for (let i = 1; i <= limit + 1; i++) {
    try {
      const response = await makeRequest(endpoint, {
        method,
        headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });

      if (i <= limit) {
        // Should succeed
        if (response.status === 200 || response.status === 201) {
          logSuccess(`Request ${i}/${limit}: Success (${response.status})`);
          logInfo(`  Remaining: ${response.headers.remaining || 'N/A'}`);
          results.passed++;
        } else if (response.status === 429) {
          logError(`Request ${i}/${limit}: Rate limited too early!`);
          logInfo(`  Expected to succeed but got 429`);
          logInfo(`  Limit: ${response.headers.limit || 'N/A'}`);
          logInfo(`  Remaining: ${response.headers.remaining || 'N/A'}`);
          results.failed++;
        } else {
          logWarning(`Request ${i}/${limit}: Unexpected status ${response.status}`);
          logInfo(`  Error: ${response.data.error || 'Unknown'}`);
          results.failed++;
        }
      } else {
        // Should be rate limited
        if (response.status === 429) {
          logSuccess(`Request ${i}/${limit}: Correctly rate limited (429)`);
          logInfo(`  Message: ${response.data.message || 'N/A'}`);
          logInfo(`  Limit: ${response.headers.limit || 'N/A'}`);
          logInfo(`  Remaining: ${response.headers.remaining || 'N/A'}`);
          logInfo(`  Reset: ${response.headers.reset || 'N/A'}`);
          logInfo(`  Retry-After: ${response.headers.retryAfter || 'N/A'} seconds`);
          results.blocked++;
        } else {
          logError(`Request ${i}/${limit}: Should be rate limited but got ${response.status}`);
          results.failed++;
        }
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logError(`Request ${i}/${limit}: Error - ${error.message}`);
      results.failed++;
    }
  }

  // Summary
  log(`\n${'-'.repeat(60)}`, colors.blue);
  log(`Summary for ${name}:`, colors.blue);
  logSuccess(`Passed: ${results.passed}`);
  logError(`Failed: ${results.failed}`);
  logSuccess(`Correctly Blocked: ${results.blocked}`);

  const totalExpected = limit + 1;
  const successRate = ((results.passed + results.blocked) / totalExpected) * 100;

  if (successRate === 100) {
    logSuccess(`✓ All tests passed (${successRate.toFixed(0)}%)`);
  } else {
    logError(`✗ Some tests failed (${successRate.toFixed(0)}% success rate)`);
  }
  log('-'.repeat(60), colors.blue);

  return results;
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          Rate Limit Testing Suite                     ║', colors.cyan);
  log('║          Kinex Fit API                                ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝', colors.cyan);

  logInfo('\nChecking prerequisites...');

  // Check if dev server is running
  try {
    await fetch(`${BASE_URL}/api/health`);
    logSuccess('Dev server is running');
  } catch (error) {
    logError('Dev server is not running!');
    if (error) {
      logError(String(error));
    }
    logInfo('Please start the dev server with: npm run dev');
    process.exit(1);
  }

  // Check session cookie
  getSessionCookie();

  // Check Upstash configuration
  logInfo('\nChecking Upstash configuration...');
  logWarning('Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in .env.local');
  logWarning('If not configured, rate limiting will fail open (allow all requests)');

  logInfo('\n⏳ Starting tests in 3 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Define test cases
  const testCases = [
    {
      name: 'Workouts GET (Read)',
      endpoint: '/api/workouts',
      method: 'GET',
      limit: 100,
      description: 'General read operations (100 per minute)',
    },
    {
      name: 'Workouts POST (Write)',
      endpoint: '/api/workouts',
      method: 'POST',
      body: {
        workoutId: 'test-' + Date.now(),
        title: 'Rate Limit Test Workout',
        description: 'Testing rate limits',
        exercises: [],
        content: 'Test content',
        source: 'test',
      },
      limit: 50,
      description: 'Write operations (50 per minute)',
    },
    // Note: OCR, Instagram, Upload, and AI tests would require more setup
    // They are commented out for now but included as examples
    /*
    {
      name: 'OCR Processing',
      endpoint: '/api/ocr',
      method: 'POST',
      body: {
        image: 'base64_image_data_here',
      },
      limit: 10,
      description: 'OCR processing (10 per hour)',
    },
    {
      name: 'Instagram Fetch',
      endpoint: '/api/instagram-fetch',
      method: 'POST',
      body: {
        url: 'https://www.instagram.com/p/example/',
      },
      limit: 20,
      description: 'Instagram fetching (20 per hour)',
    },
    {
      name: 'File Upload',
      endpoint: '/api/upload-image',
      method: 'POST',
      // body: FormData with file
      limit: 20,
      description: 'File uploads (20 per hour)',
    },
    {
      name: 'AI Enhancement',
      endpoint: '/api/ai/enhance-workout',
      method: 'POST',
      body: {
        workoutId: 'existing-workout-id',
        enhancementType: 'full',
      },
      limit: 30,
      description: 'AI workout enhancement (30 per hour)',
    },
    */
  ];

  const allResults = [];

  // Run tests sequentially
  for (const testCase of testCases) {
    const results = await testRateLimit(testCase);
    allResults.push({ name: testCase.name, results });

    // Wait between test suites to avoid cross-contamination
    logInfo('\n⏳ Waiting 5 seconds before next test suite...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Final summary
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          FINAL SUMMARY                                 ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝', colors.cyan);

  allResults.forEach(({ name, results }) => {
    const total = results.passed + results.failed + results.blocked;
    const success = results.passed + results.blocked;
    const rate = ((success / total) * 100).toFixed(0);

    log(`\n${name}:`, colors.blue);
    logSuccess(`  Passed: ${results.passed}`);
    logError(`  Failed: ${results.failed}`);
    logSuccess(`  Blocked: ${results.blocked}`);
    log(`  Success Rate: ${rate}%`, rate === '100' ? colors.green : colors.red);
  });

  const totalFailed = allResults.reduce((sum, r) => sum + r.results.failed, 0);

  if (totalFailed === 0) {
    log('\n' + '='.repeat(60), colors.green);
    logSuccess('🎉 ALL TESTS PASSED! Rate limiting is working correctly.');
    log('='.repeat(60), colors.green);
  } else {
    log('\n' + '='.repeat(60), colors.red);
    logError(`⚠️  ${totalFailed} TEST(S) FAILED! Please review the logs above.`);
    log('='.repeat(60), colors.red);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
