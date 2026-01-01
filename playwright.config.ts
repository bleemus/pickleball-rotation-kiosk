import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run serially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  // Run backend + frontend + email-parser dev servers before tests
  webServer: [
    {
      command: "cd backend && npm run dev",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: "test",
        REDIS_URL: "redis://localhost:6379",
        PORT: "3001",
        EMAIL_PARSER_URL: "http://localhost:3002",
      },
    },
    {
      command: "cd email-parser && npm run dev",
      url: "http://localhost:3002/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: "test",
        REDIS_URL: "redis://localhost:6379",
        PORT: "3002",
        ENABLE_EMAIL_POLLING: "false",
      },
    },
    {
      command: "cd frontend && npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
