/**
 * List All Stripe Products and Their Price IDs
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

async function main() {
  console.log('\n==========================================');
  console.log('📦 ALL STRIPE PRODUCTS & PRICES');
  console.log('==========================================\n');

  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  for (const product of products.data) {
    console.log(`\n🏷️  Product: ${product.name}`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Description: ${product.description || 'N/A'}`);

    // Get prices for this product
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    if (prices.data.length > 0) {
      console.log(`   \n   💰 Prices:`);
      for (const price of prices.data) {
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'N/A';
        const interval = price.recurring?.interval || 'one-time';
        console.log(`      • Price ID: ${price.id}`);
        console.log(`        Amount: ${amount}/${interval}`);
        console.log(`        Active: ${price.active}`);
      }
    } else {
      console.log(`   ⚠️  No prices found for this product`);
    }
  }

  console.log('\n==========================================');
  console.log('💡 INSTRUCTIONS:');
  console.log('==========================================');
  console.log('1. Find your Core, Pro, and Elite products above');
  console.log('2. Copy the PRICE IDs (not product IDs)');
  console.log('3. Update your .env.local with the price IDs');
  console.log('4. Format should be:');
  console.log('   STRIPE_PRICE_CORE=price_xxxxx');
  console.log('   NEXT_PUBLIC_STRIPE_PRICE_CORE=price_xxxxx');
  console.log('\n');
}

main().catch(console.error);
