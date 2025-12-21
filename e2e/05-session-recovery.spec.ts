import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Session Persistence and Recovery", () => {
  test("restores session after page refresh", async ({ page }) => {
    const game = new GamePage(page);
    await page.goto("/");

    // Clear any existing state
    await page.evaluate(() => localStorage.clear());

    // Setup game
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    // Verify Round 1 is active
    await game.expectRoundNumber(1);

    // Get session ID from localStorage
    const sessionId = await page.evaluate(() => localStorage.getItem("pickleballSessionId"));
    expect(sessionId).toBeTruthy();

    // Refresh the page
    await page.reload();

    // Session should be restored
    await expect(page.locator("text=Round 1")).toBeVisible({ timeout: 5000 });
    await game.expectCourtNumber(1);

    // Session ID should still be the same
    const restoredSessionId = await page.evaluate(() =>
      localStorage.getItem("pickleballSessionId")
    );
    expect(restoredSessionId).toBe(sessionId);
  });

  test("persists scores after page refresh", async ({ page }) => {
    const game = new GamePage(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Setup and play
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    // Enter scores
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Wait for return to player manager view (round is complete)
    await expect(page.locator('button:has-text(\"Start Next Round\")')).toBeVisible({
      timeout: 5000,
    });

    // Scores won't be visible on player manager - they're in history
    // But player stats should show wins/losses
    await expect(page.locator("text=1W - 0L").first()).toBeVisible();
    await expect(page.locator("text=0W - 1L").first()).toBeVisible();

    // Refresh page
    await page.reload();

    // Player stats should still be visible after reload
    await expect(page.locator("text=1W - 0L").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=0W - 1L").first()).toBeVisible();

    // "Start Next Round" should still be available
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible();
  });

  test("continues from mid-game state", async ({ page }) => {
    const game = new GamePage(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Setup and complete Round 1
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Heidi",
    ]);
    await game.startGame();

    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.enterScoreForMatch(1, 11, 7);
    await game.submitScores();

    // Start Round 2
    await game.startNextRound();
    await game.expectRoundNumber(2);

    // Refresh in middle of Round 2
    await page.reload();

    // Should restore to Round 2
    await expect(page.locator("text=Round 2")).toBeVisible({ timeout: 5000 });

    // Should be able to continue playing
    await game.enterScoresMode();
    await expect(page.locator("text=Enter Scores")).toBeVisible();
  });

  test("clears session on reset", async ({ page }) => {
    const game = new GamePage(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Create a game
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    // Verify session exists
    let sessionId = await page.evaluate(() => localStorage.getItem("pickleballSessionId"));
    expect(sessionId).toBeTruthy();

    // Click Back to Manage
    await page.click('button:has-text("Cancel Round")');

    // Wait for player management view
    await page.waitForTimeout(500);
    // Setup dialog handler for confirm
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    // Look for any Reset buttons and click one
    const resetButtons = await page.locator('button:has-text("Reset")').all();
    if (resetButtons.length > 0) {
      await resetButtons[0].click();

      // Wait for reset to complete by checking for setup screen
      await expect(page.locator("text=No players added yet")).toBeVisible({ timeout: 3000 });

      // Session ID should be cleared
      sessionId = await page.evaluate(() => localStorage.getItem("pickleballSessionId"));
      expect(sessionId).toBeNull();
    }
  });
});
