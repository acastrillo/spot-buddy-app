/**
 * Check which Stripe account we're connected to
 */

import Stripe from 'stripe';

async function main() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  console.log('\n==========================================');
  console.log('🔍 STRIPE ACCOUNT INFO');
  console.log('==========================================\n');

  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    return;
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });

  try {
    // Get account info
    const account = await stripe.accounts.retrieve();

    console.log('API Key (from .env.local):');
    console.log(`  ${apiKey.substring(0, 20)}...`);
    console.log(`  Mode: ${apiKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'}\n`);

    console.log('Connected Account:');
    console.log(`  Account ID: ${account.id}`);
    console.log(`  Email: ${account.email || 'N/A'}`);
    console.log(`  Display Name: ${account.settings?.dashboard?.display_name || 'N/A'}`);
    console.log(`  Business Name: ${account.business_profile?.name || 'N/A'}`);
    console.log(`  Country: ${account.country}`);
    console.log(`  Created: ${new Date(account.created * 1000).toLocaleDateString()}\n`);

    console.log('Dashboard URL:');
    console.log(`  https://dashboard.stripe.com/${account.id}\n`);

    console.log('==========================================');
    console.log('💡 VERIFY THIS MATCHES YOUR DASHBOARD');
    console.log('==========================================');
    console.log('1. Look at the account switcher (top-left of Stripe Dashboard)');
    console.log('2. Make sure the account name matches above');
    console.log('3. If different, you\'re viewing a different Stripe account!');
    console.log('   - Either switch accounts in dashboard OR');
    console.log('   - Use the API key from the account you\'re viewing\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
