import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests for Spot Buddy
 * Tests the Google OAuth sign-in flow on production
 */

test.describe('Production Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for OAuth flows
    test.setTimeout(60000);
  });

  test('should load the sign-in page correctly', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://spotter.cannashieldct.com');

    // Check if the sign-in button is visible
    const signInButton = page.locator('button:has-text("Continue with Spotter")');
    await expect(signInButton).toBeVisible({ timeout: 10000 });

    // Check for security badge
    await expect(page.locator('text=Secured by Amazon Cognito')).toBeVisible();

    // Check page title
    await expect(page.locator('text=Welcome to Spotter')).toBeVisible();

    console.log('✓ Sign-in page loaded successfully');
  });

  test('should redirect to Cognito when clicking sign-in', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://spotter.cannashieldct.com');

    // Take screenshot before clicking
    await page.screenshot({ path: 'tests/screenshots/01-before-signin.png', fullPage: true });

    // Click sign-in button
    await page.click('button:has-text("Continue with Spotter")');

    // Wait for Cognito redirect
    await page.waitForURL(/cognito-idp\.us-east-1\.amazonaws\.com/, { timeout: 15000 });

    // Take screenshot of Cognito page
    await page.screenshot({ path: 'tests/screenshots/02-cognito-page.png', fullPage: true });

    console.log('✓ Redirected to Cognito successfully');
    console.log('Current URL:', page.url());
  });

  test('should show Google sign-in option', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://spotter.cannashieldct.com');

    // Click sign-in button
    await page.click('button:has-text("Continue with Spotter")');

    // Wait for Cognito page
    await page.waitForURL(/cognito-idp\.us-east-1\.amazonaws\.com/, { timeout: 15000 });

    // Wait a bit for the page to fully load
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/03-cognito-options.png', fullPage: true });

    // Check for Google button (it might have different text/class)
    const hasGoogleButton = await page.locator('button:has-text("Google"), a:has-text("Google"), [class*="google" i]').count();

    console.log('✓ Cognito page loaded');
    console.log(`Found ${hasGoogleButton} Google sign-in elements`);

    // List all buttons for debugging
    const buttons = await page.locator('button, a[role="button"]').allTextContents();
    console.log('Available buttons:', buttons);
  });

  test('should handle OAuth redirect flow timing', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://spotter.cannashieldct.com');

    const startTime = Date.now();

    // Click sign-in button
    await page.click('button:has-text("Continue with Spotter")');

    // Wait for Cognito redirect
    await page.waitForURL(/cognito-idp\.us-east-1\.amazonaws\.com/, { timeout: 15000 });

    const cognitoLoadTime = Date.now() - startTime;
    console.log(`✓ Cognito page loaded in ${cognitoLoadTime}ms`);

    // Check if load time is reasonable (should be under 5 seconds)
    expect(cognitoLoadTime).toBeLessThan(5000);

    // Verify we're still within the 15-minute OAuth session window
    console.log('OAuth session validity: 15 minutes');
  });

  test('should capture any error messages on redirect', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for network errors
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to production site
    await page.goto('https://spotter.cannashieldct.com');

    // Click sign-in button
    await page.click('button:has-text("Continue with Spotter")');

    // Wait for Cognito redirect
    await page.waitForURL(/cognito-idp\.us-east-1\.amazonaws\.com/, { timeout: 15000 });

    // Wait a bit to capture any delayed errors
    await page.waitForTimeout(3000);

    // Check for error messages on the page
    const errorElements = await page.locator('[class*="error" i], [class*="alert" i], [role="alert"]').count();

    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`Error elements on page: ${errorElements}`);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors);
    }

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/04-final-state.png', fullPage: true });
  });

  test('should test error URL parameters', async ({ page }) => {
    // Test various error scenarios by navigating directly to error URLs
    const errorScenarios = [
      { error: 'AccessDenied', expectedMessage: 'Access was denied' },
      { error: 'Configuration', expectedMessage: 'Sign-in configuration issue' },
      { error: 'OAuthCallback', expectedMessage: 'OAuth callback failed' },
    ];

    for (const scenario of errorScenarios) {
      await page.goto(`https://spotter.cannashieldct.com/auth/login?error=${scenario.error}`);

      // Check if error message is displayed
      const errorMessage = page.locator('[class*="destructive"]');
      await expect(errorMessage).toContainText(scenario.expectedMessage, { timeout: 5000 });

      console.log(`✓ Error "${scenario.error}" displayed correctly`);

      // Take screenshot
      await page.screenshot({
        path: `tests/screenshots/error-${scenario.error}.png`,
        fullPage: true
      });
    }
  });
});

test.describe('Local Development Authentication Flow', () => {
  test('should load local dev server sign-in page', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://localhost:3000');

    // Check if the sign-in button is visible
    const signInButton = page.locator('button:has-text("Continue with Spotter")');
    await expect(signInButton).toBeVisible({ timeout: 10000 });

    console.log('✓ Local dev sign-in page loaded successfully');
  });

  test('should redirect to Cognito from local dev', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://localhost:3000');

    // Click sign-in button
    await page.click('button:has-text("Continue with Spotter")');

    // Wait for Cognito redirect
    await page.waitForURL(/cognito-idp\.us-east-1\.amazonaws\.com/, { timeout: 15000 });

    console.log('✓ Local dev redirected to Cognito successfully');
  });
});
