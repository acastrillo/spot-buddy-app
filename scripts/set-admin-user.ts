/**
 * Set Admin Status for a User
 *
 * Usage: npx tsx scripts/set-admin-user.ts <email> [true|false]
 *
 * Examples:
 *   npx tsx scripts/set-admin-user.ts acastrillo87@gmail.com true
 *   npx tsx scripts/set-admin-user.ts user@example.com false
 */

import { dynamoDBUsers } from '../src/lib/dynamodb';

async function setAdminUser(email: string, isAdmin: boolean = true) {
  try {
    console.log(`\n🔍 Looking up user: ${email}...`);

    // Get user by email
    const user = await dynamoDBUsers.getByEmail(email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\nMake sure the user has signed in at least once to create their account.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.id})`);
    console.log(`   Current tier: ${user.subscriptionTier}`);
    console.log(`   Current admin status: ${user.isAdmin === true ? 'Yes' : 'No'}`);

    // Set admin status
    console.log(`\n${isAdmin ? '🔓 Granting' : '🔒 Revoking'} admin access...`);
    await dynamoDBUsers.setAdminStatus(user.id, isAdmin);

    console.log(`✅ ${isAdmin ? 'Admin access granted!' : 'Admin access revoked!'}`);

    if (isAdmin) {
      console.log('\n📋 Admin benefits:');
      console.log('   • Unlimited OCR scans (bypasses weekly quota)');
      console.log('   • Unlimited AI requests (bypasses monthly quota)');
      console.log('   • Unlimited Instagram imports (bypasses weekly quota)');
      console.log('   • Bypasses all rate limits');
      console.log('   • Access to admin API endpoints');
    }

    // Verify the change
    const updatedUser = await dynamoDBUsers.get(user.id);
    console.log(`\n✅ Verified: isAdmin = ${updatedUser?.isAdmin === true}`);

  } catch (error) {
    console.error('❌ Error setting admin status:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Usage: npx tsx scripts/set-admin-user.ts <email> [true|false]');
  console.error('\nExamples:');
  console.error('  npx tsx scripts/set-admin-user.ts acastrillo87@gmail.com true');
  console.error('  npx tsx scripts/set-admin-user.ts user@example.com false');
  process.exit(1);
}

const email = args[0];
const isAdmin = args[1] !== 'false'; // Default to true if not specified

setAdminUser(email, isAdmin);
