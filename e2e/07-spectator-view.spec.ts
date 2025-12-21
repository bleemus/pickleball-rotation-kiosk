import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Spectator View", () => {
  // Set viewport to desktop size for spectator view tests
  test.use({ viewport: { width: 1280, height: 720 } });

  test("shows welcome screen when no active session", async ({ page, cleanState }) => {
    // Navigate directly to spectator view
    await page.goto("/spectator");

    // Should show welcome/setup message when no session
    // Either "No active game session" or welcome instructions
    const hasWelcome = await page
      .locator("text=Welcome")
      .isVisible()
      .catch(() => false);
    const hasNoSession = await page
      .locator("text=No active game")
      .isVisible()
      .catch(() => false);
    const hasSetup = await page
      .locator("text=Setup Instructions")
      .isVisible()
      .catch(() => false);

    expect(hasWelcome || hasNoSession || hasSetup).toBeTruthy();
  });

  test("displays session when game is active", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup and start a game with fewer players (faster)
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();
    await game.expectRoundNumber(1);

    // Navigate to spectator view in same page
    await page.goto("/spectator");

    // Wait for session to load
    await page.waitForTimeout(3000);

    // Should show round info or court info
    const hasRound = await page
      .locator("text=Round")
      .first()
      .isVisible()
      .catch(() => false);
    const hasCourt = await page
      .locator("text=Court")
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRound || hasCourt).toBeTruthy();
  });

  test("redirects mobile users to main app", async ({ page, cleanState }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to spectator view
    await page.goto("/spectator");

    // Should show mobile redirect message
    await expect(page.locator("text=Mobile Device Detected")).toBeVisible({ timeout: 5000 });

    // Should have a link to go to entry screen
    await expect(page.locator("text=Go to Entry Screen")).toBeVisible();
  });

  test("shows QR code on desktop", async ({ page, cleanState }) => {
    // Navigate to spectator view
    await page.goto("/spectator");

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should have a QR code element (SVG elements from react-qr-code)
    const qrCode = page.locator("svg").first();
    await expect(qrCode).toBeVisible({ timeout: 5000 });
  });
});
