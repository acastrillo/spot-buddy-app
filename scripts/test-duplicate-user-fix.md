# Testing the Duplicate User Fix

## What Was Fixed

The duplicate user bug was caused by **PrismaAdapter** creating new users on every OAuth sign-in. The fix:

1. **Removed PrismaAdapter** - DynamoDB is now the single source of truth
2. **Added signIn callback** - Checks DynamoDB for existing user by email BEFORE creating
3. **Reuses existing IDs** - If user exists, we use their ID; only creates new UUID for new users

## Testing Steps

### Step 1: Clean Up Existing Users

```bash
# List all current users
node scripts/list-all-users.mjs

# Delete all users (safety check required)
node scripts/delete-all-users.mjs --confirm
```

### Step 2: Sign Out Completely

1. Go to https://spotter.cannashieldct.com
2. Click "Sign Out" in the header
3. **Clear browser cookies** for cannashieldct.com (important!)
4. Close all browser tabs for the site

### Step 3: Sign In with OAuth

1. Go to https://spotter.cannashieldct.com
2. Click "Sign In"
3. Choose Google or Facebook OAuth
4. Complete the sign-in flow

### Step 4: Verify Only ONE User Created

```bash
# List all users - should see EXACTLY ONE user
node scripts/list-all-users.mjs
```

**Expected output:**
```
✅ Found 1 total user(s)
═══════════════════════════════════════════════════════════

📧 your-email@example.com
   ───────────────────────────────────────────────────────
   User ID: <some-uuid>
   Email: your-email@example.com
   Tier: free
   Status: active
   Stripe Customer: none
   Created: <timestamp>

═══════════════════════════════════════════════════════════

✅ No duplicate emails found

📊 Total users: 1
```

### Step 5: Test Sign In/Out Multiple Times

1. Sign out from the app
2. Sign in again with the SAME OAuth provider
3. Run `node scripts/list-all-users.mjs`
4. **Should still see only ONE user** with the same ID

### Step 6: Test Subscription Upgrade

1. While signed in, go to Settings
2. Click "Upgrade to Pro" or "Upgrade to Elite"
3. Complete Stripe test checkout:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
4. After redirect back to Settings, wait 5 seconds
5. Verify tier shows as upgraded in the UI

### Step 7: Verify Upgrade Stuck to Same User

```bash
# List all users - should STILL be just ONE user
node scripts/list-all-users.mjs

# Verify the single user now has upgraded tier
# Expected: Same User ID, Tier: pro or elite
```

## Success Criteria

✅ **Only ONE user created** per email address
✅ **Same user ID** across sign-in/sign-out cycles
✅ **Subscription upgrade** sticks to the single user
✅ **UI reflects** the correct subscription tier
✅ **No duplicate users** in DynamoDB

## If Tests Fail

### Multiple users created:
- Check [auth-options.ts:src/lib/auth-options.ts] signIn callback
- Verify logs show "✓ Existing user found" message
- Check DynamoDB email-index GSI exists

### Subscription upgrade to wrong user:
- Check [stripe/webhook/route.ts:src/app/api/stripe/webhook/route.ts]
- Verify webhook uses stripeCustomerId-index to find user
- Check logs for webhook user resolution

### UI not updating:
- Verify session refresh logic in [settings/page.tsx:src/app/settings/page.tsx]
- Check JWT callback in [auth-options.ts:src/lib/auth-options.ts] line 377-400

## Monitoring Logs

To see auth flow in real-time during testing:

```bash
# Monitor auth-related logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow --format short --filter-pattern "Auth:SignIn OR Auth:JWT"
```

Look for these log messages:
- `[Auth:SignIn] ✓ Existing user found for <email> - ID: <uuid>`
- `[Auth:SignIn] ✓ Creating new user for <email> - ID: <uuid>`
- `[Auth:JWT] Initial sign-in via google for user <uuid>`
- `[Auth:JWT] ✓ User <uuid> synced to DynamoDB (<email>)`

## Next Steps After Success

Once all tests pass:
1. ✅ Duplicate user bug is fixed
2. 📱 Can proceed with mobile backend API implementation
3. 🧪 Test mobile checkout flow
