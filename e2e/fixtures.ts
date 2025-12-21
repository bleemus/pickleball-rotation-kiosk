import { test as base, expect } from '@playwright/test';

type Fixtures = {
  cleanState: void;
};

// Helper function to clear Redis
async function clearRedis() {
  try {
    const response = await fetch('http://localhost:3001/api/test/cleanup', {
      method: 'POST',
    });

    if (!response.ok) {
      console.warn('Failed to cleanup Redis:', await response.text());
    }
  } catch (error) {
    console.warn('Error calling cleanup endpoint:', error);
  }
}

export const test = base.extend<Fixtures>({
  // Auto-run before every test to clear Redis
  page: async ({ page }, use) => {
    // Clear Redis before each test
    await clearRedis();
    await use(page);
  },

  // Additional fixture for tests that want to clear localStorage too
  cleanState: async ({ page }, use) => {
    // Navigate to page and clear all storage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload to ensure clean state
    await page.reload();

    // Wait for app to be ready (check for setup screen or loading to finish)
    await page.waitForLoadState('networkidle');

    await use();
  },
});

export { expect };
