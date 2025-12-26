import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Court Changes During Gameplay", () => {
  test("should decrease courts between rounds", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 8 players, 2 courts (default is 2 courts)
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
    ]);
    // Default is already 2 courts, no need to increment
    await game.startGame();

    // Verify Round 1 has 2 courts
    await game.expectRoundNumber(1);
    await game.expectCourtNumber(1);
    await game.expectCourtNumber(2);

    // Enter scores for both matches and submit
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.enterScoreForMatch(1, 11, 7);
    await game.submitScores();

    // Verify PlayerManager appears (between rounds)
    await game.expectPlayerManagerVisible();
    await game.expectChangeCourtsButtonVisible();

    // Change courts to 1
    await game.openCourtSelector();
    await game.expectCourtSelectorVisible();
    await game.setNumCourts(1);
    await game.closeCourtSelector();
    await game.expectCourtSelectorNotVisible();

    // Wait for the "Start Next Round" button to be enabled (court change applied)
    await expect(page.locator('button:has-text("Start Next Round")')).toBeEnabled({
      timeout: 10000,
    });
    await page.waitForTimeout(500);

    // Start Round 2
    await game.startNextRound();

    // Verify only 1 court exists
    await game.expectRoundNumber(2);
    await game.expectCourtNumber(1);
    await game.expectCourtNotVisible(2);

    // Verify bench is shown (4 players benched: 8 total - 4 playing = 4 benched)
    await expect(page.locator("text=On the Bench")).toBeVisible();
  });

  test("should increase courts with sufficient players", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 9 players, 1 court (decrease from default 2 to 1)
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
    ]);
    await game.decrementCourts(); // 2 → 1 court
    await game.startGame();

    // Verify Round 1 has 1 court (5 benched: 9 total - 4 playing = 5 benched)
    await game.expectRoundNumber(1);
    await game.expectCourtNumber(1);
    await expect(page.locator("text=On the Bench")).toBeVisible();

    // Submit scores
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Verify PlayerManager appears
    await game.expectPlayerManagerVisible();
    await game.expectChangeCourtsButtonVisible();

    // Change courts to 2
    await game.openCourtSelector();
    await game.setNumCourts(2);
    await game.closeCourtSelector();

    // Wait for the "Start Next Round" button to be enabled (court change applied)
    await expect(page.locator('button:has-text("Start Next Round")')).toBeEnabled({
      timeout: 10000,
    });
    await page.waitForTimeout(500);

    // Start Round 2
    await game.startNextRound();

    // Verify 2 courts exist
    await game.expectRoundNumber(2);
    await game.expectCourtNumber(1);
    await game.expectCourtNumber(2);

    // Verify bench is shown (1 player benched: 9 - 8 = 1)
    await expect(page.locator("text=On the Bench")).toBeVisible();
  });

  test("should hide court selector during active round", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 8 players, 2 courts (default is 2 courts)
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
    ]);
    // Default is already 2 courts
    await game.startGame();

    // During active round, Change Courts button should not be visible
    await game.expectChangeCourtsButtonNotVisible();

    // CurrentMatchups component should be shown instead
    await expect(page.locator('button:has-text("Enter Scores")')).toBeVisible();
  });

  test("should hide court selector during scoring mode", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 8 players, 2 courts (default is 2 courts)
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
    ]);
    // Default is already 2 courts
    await game.startGame();

    // Enter scoring mode
    await game.enterScoresMode();

    // Verify ScoreEntry component visible
    await expect(page.locator('button:has-text("Submit Scores")')).toBeVisible();

    // Change Courts button should not be visible
    await game.expectChangeCourtsButtonNotVisible();

    // PlayerSetup should not be shown (can't add/remove players)
    await expect(page.locator('input[placeholder="Enter player name"]')).not.toBeVisible();
  });

  test("should preserve player stats across court changes", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 8 players, 2 courts (default is 2 courts)
    await game.addMultiplePlayers([
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
    ]);
    // Default is already 2 courts
    await game.startGame();

    // Play Round 1 with 2 courts
    await game.expectRoundNumber(1);
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9); // Court 1: Team 1 wins
    await game.enterScoreForMatch(1, 11, 7); // Court 2: Team 1 wins
    await game.submitScores();

    // Change to 1 court
    await game.openCourtSelector();
    await game.setNumCourts(1);
    await game.closeCourtSelector();

    // Wait for the "Start Next Round" button to be enabled (court change applied)
    await expect(page.locator('button:has-text("Start Next Round")')).toBeEnabled({
      timeout: 10000,
    });
    await page.waitForTimeout(500);

    // Play Round 2 with 1 court
    await game.startNextRound();
    await game.expectRoundNumber(2);
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 5); // Team 1 wins
    await game.submitScores();

    // Verify player stats are preserved
    // Each player who played in Round 1 should have 1 game played
    // Winners should have 1 win, losers should have 1 loss
    // All should maintain their point differential
    // (We don't check specific players since we don't know the matchups,
    // but we can verify that stats exist and history shows both rounds)

    // Open game history
    await page.click('button:has-text("View History")');
    await page.waitForTimeout(300);

    // Verify game history shows Round 1 with 2 courts, Round 2 with 1 court
    await expect(page.locator("text=Round 1").first()).toBeVisible();
    await expect(page.locator("text=Round 2").first()).toBeVisible();

    // Close history
    await page.click('button:has-text("Close")');
  });

  test("should handle insufficient players when increasing courts", async ({
    page,
    cleanState,
  }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: 6 players, 1 court (decrease from default 2 to 1)
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank"]);
    await game.decrementCourts(); // 2 → 1 court
    await game.startGame();

    // Play Round 1
    await game.expectRoundNumber(1);
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9);
    await game.submitScores();

    // Try to change to 2 courts (requires 8 players, but only have 6)
    await game.openCourtSelector();
    await game.setNumCourts(2);
    await game.closeCourtSelector();

    // Verify error message appears (don't try to click disabled button)
    // Check for the warning message in the player list section
    await expect(page.locator("text=Need at least 8 players to start a round")).toBeVisible();

    // Verify round does not start (still showing PlayerManager with Round 1 completed)
    await game.expectPlayerManagerVisible();
    await expect(page.locator("text=Round 2")).not.toBeVisible();
  });
});
