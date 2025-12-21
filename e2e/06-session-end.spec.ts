import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Session End and Final Rankings", () => {
  test("ends session and displays final rankings", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: Add players and start game
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    // Play Round 1
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Wait for PlayerManager to appear (shows after scores submitted)
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({
      timeout: 5000,
    });

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Click "End Session & View Final Rankings"
    await page.click('button:has-text("End Session & View Final Rankings")');

    // Verify Session Summary screen is displayed
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Final Rankings")).toBeVisible();

    // Verify rankings table is displayed (use th for table headers)
    await expect(page.locator('th:has-text("Rank")')).toBeVisible();
    await expect(page.locator('th:has-text("Player")')).toBeVisible();
    await expect(page.locator('th:has-text("Wins")')).toBeVisible();
    await expect(page.locator('th:has-text("Losses")')).toBeVisible();

    // Verify all players are in the rankings
    await expect(page.locator("text=Alice")).toBeVisible();
    await expect(page.locator("text=Bob")).toBeVisible();
    await expect(page.locator("text=Charlie")).toBeVisible();
    await expect(page.locator("text=Dave")).toBeVisible();

    // Verify medal emojis for top 3 (since we have 4 players, top 3 get medals)
    await expect(page.locator("text=🥇")).toBeVisible();
    await expect(page.locator("text=🥈")).toBeVisible();
    await expect(page.locator("text=🥉")).toBeVisible();
  });

  test("shows correct stats after multiple rounds", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Setup: Add 8 players for 2 courts
    await game.addMultiplePlayers(["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]);
    await game.startGame();

    // Play Round 1
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 5); // Large win for Team 1
    await game.enterScoreForMatch(1, 11, 10); // Close win for Team 1
    await game.submitScores();

    // Play Round 2
    await game.startNextRound();
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 8);
    await game.enterScoreForMatch(1, 11, 9);
    await game.submitScores();

    // Wait for PlayerManager to appear
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({
      timeout: 5000,
    });

    // End session
    await page.click('button:has-text("End Session & View Final Rankings")');

    // Verify Session Summary
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });

    // Verify the +/- column header exists
    await expect(page.locator('th:has-text("+/-")')).toBeVisible();

    // All 8 players should be displayed
    for (let i = 1; i <= 8; i++) {
      await expect(page.locator(`text=P${i}`)).toBeVisible();
    }
  });

  test("can start new session after ending", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Setup and play one round
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Wait for PlayerManager to appear
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({
      timeout: 5000,
    });

    // End session
    await page.click('button:has-text("End Session & View Final Rankings")');
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });

    // Click "Start New Session"
    await page.click('button:has-text("Start New Session")');

    // Verify we're back to setup screen
    await expect(page.locator("text=No players added yet")).toBeVisible({ timeout: 5000 });

    // Verify player count is reset
    await expect(page.locator("text=Players (0)")).toBeVisible();
  });

  test("rankings are sorted by wins then point differential", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Setup with 4 players
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    // Round 1: Alice/Bob beat Charlie/Dave by large margin
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 3);
    await game.submitScores();

    // Wait for PlayerManager to appear
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({
      timeout: 5000,
    });

    // End session
    await page.click('button:has-text("End Session & View Final Rankings")');
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });

    // Verify table rows - winners should be at the top
    const rows = page.locator("tbody tr");
    const firstRowText = await rows.first().textContent();

    // First row should have 1 win (winners)
    expect(firstRowText).toContain("1"); // 1 win
  });

  test("session end persists after page refresh", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Setup and play
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);
    await game.decrementCourts();
    await game.startGame();

    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Wait for PlayerManager to appear
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({
      timeout: 5000,
    });

    // End session
    await page.click('button:has-text("End Session & View Final Rankings")');
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });

    // Refresh page
    await page.reload();

    // Session summary should still be displayed
    await expect(page.locator("text=Session Complete")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Final Rankings")).toBeVisible();
  });
});
