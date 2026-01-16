/**
 * Script to add a password to an existing OAuth user
 * Usage: node scripts/add-password-to-user.js <email> <password>
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { hash } = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import DynamoDB functions
const { dynamoDBUsers } = require('../src/lib/dynamodb');
const { maskEmail } = require('../src/lib/safe-logger');

async function addPasswordToUser(email, password) {
  try {
    console.log(`[AddPassword] Looking up user: ${maskEmail(email)}`);

    // Check if user exists
    const existingUser = await dynamoDBUsers.getByEmail(email);
    if (!existingUser) {
      console.error(`[AddPassword] ✗ User not found: ${maskEmail(email)}`);
      process.exit(1);
    }

    console.log(`[AddPassword] ✓ Found user: ${existingUser.id}`);
    console.log(`[AddPassword] Current passwordHash: ${existingUser.passwordHash ? 'SET' : 'NOT SET'}`);

    // Hash the password
    console.log(`[AddPassword] Hashing password...`);
    const passwordHash = await hash(password, 12);
    console.log(`[AddPassword] ✓ Password hashed successfully`);

    // Update user with password hash
    console.log(`[AddPassword] Updating user in DynamoDB...`);
    await dynamoDBUsers.upsert({
      id: existingUser.id,
      email: existingUser.email,
      passwordHash,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      emailVerified: existingUser.emailVerified,
      subscriptionTier: existingUser.subscriptionTier,
      subscriptionStatus: existingUser.subscriptionStatus,
      subscriptionStartDate: existingUser.subscriptionStartDate,
      subscriptionEndDate: existingUser.subscriptionEndDate,
      trialEndsAt: existingUser.trialEndsAt,
      stripeCustomerId: existingUser.stripeCustomerId,
      stripeSubscriptionId: existingUser.stripeSubscriptionId,
      ocrQuotaUsed: existingUser.ocrQuotaUsed,
      ocrQuotaLimit: existingUser.ocrQuotaLimit,
      ocrQuotaResetDate: existingUser.ocrQuotaResetDate,
      workoutsSaved: existingUser.workoutsSaved,
      aiRequestsUsed: existingUser.aiRequestsUsed,
      aiRequestsLimit: existingUser.aiRequestsLimit,
      lastAiRequestReset: existingUser.lastAiRequestReset,
      trainingProfile: existingUser.trainingProfile,
      onboardingCompleted: existingUser.onboardingCompleted,
      onboardingSkipped: existingUser.onboardingSkipped,
      onboardingCompletedAt: existingUser.onboardingCompletedAt,
      isBeta: existingUser.isBeta,
      isDisabled: existingUser.isDisabled,
      disabledAt: existingUser.disabledAt ?? null,
      disabledBy: existingUser.disabledBy ?? null,
      disabledReason: existingUser.disabledReason ?? null,
    });

    console.log(`[AddPassword] ✓ Password added successfully!`);
    console.log(`[AddPassword] User ${maskEmail(email)} can now sign in with email/password`);
    process.exit(0);
  } catch (error) {
    console.error(`[AddPassword] ✗ Error:`, error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node scripts/add-password-to-user.js <email> <password>');
  console.error('Example: node scripts/add-password-to-user.js user@example.com MyP@ssw0rd');
  process.exit(1);
}

const [email, password] = args;

// Validate password meets requirements
const passwordRegex = {
  minLength: /.{8,}/,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  special: /[^a-zA-Z0-9]/,
};

if (!passwordRegex.minLength.test(password)) {
  console.error('✗ Password must be at least 8 characters');
  process.exit(1);
}
if (!passwordRegex.lowercase.test(password)) {
  console.error('✗ Password must contain at least one lowercase letter');
  process.exit(1);
}
if (!passwordRegex.uppercase.test(password)) {
  console.error('✗ Password must contain at least one uppercase letter');
  process.exit(1);
}
if (!passwordRegex.number.test(password)) {
  console.error('✗ Password must contain at least one number');
  process.exit(1);
}
if (!passwordRegex.special.test(password)) {
  console.error('✗ Password must contain at least one special character');
  process.exit(1);
}

console.log('✓ Password validation passed');
addPasswordToUser(email, password);
