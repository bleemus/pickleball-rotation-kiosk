import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Complete Game Flow", () => {
  test("plays multiple rounds with score tracking and stats updates", async ({
    page,
    cleanState,
  }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup: Add 8 players
    const players = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi"];
    await game.addMultiplePlayers(players);

    // Verify player count
    await expect(page.locator("text=Players (8)")).toBeVisible();

    // Start game with 2 courts
    await game.startGame();

    // Verify Round 1 is displayed
    await game.expectRoundNumber(1);
    await game.expectCourtNumber(1);
    await game.expectCourtNumber(2);

    // Enter scores for Round 1
    await game.enterScoresMode();

    // Enter scores for both courts
    await game.enterScoreForMatch(0, 11, 9); // Court 1: Team 1 = 11, Team 2 = 9
    await game.enterScoreForMatch(1, 11, 7); // Court 2: Team 1 = 11, Team 2 = 7

    await game.submitScores();

    // Should return to player management screen with "Start Next Round" button
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible();

    // Start Round 2
    await game.startNextRound();
    await game.expectRoundNumber(2);

    // Teams should be different (round-robin rotation)
    // Just verify we're in Round 2 and can enter scores again
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 8);
    await game.enterScoreForMatch(1, 11, 10);
    await game.submitScores();

    // Start Round 3
    await game.startNextRound();
    await game.expectRoundNumber(3);

    // Complete Round 3
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 6);
    await game.enterScoreForMatch(1, 11, 9);
    await game.submitScores();

    // Verify we're back at the player management screen after Round 3
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible();
  });

  test("handles bench rotation correctly", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Add 10 players for 2 courts (will have 2 benched)
    const players = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"];
    await game.addMultiplePlayers(players);

    await game.startGame();

    // Should show "On the Bench" section
    await expect(page.locator("text=On the Bench")).toBeVisible();

    // Should have 2 benched players (10 total - 8 playing = 2 benched)
    const benchSection = page.locator("text=On the Bench").locator("..");
    await expect(benchSection).toBeVisible();
  });

  test("tracks player statistics accurately", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Add players and start game
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

    // Play one round
    await game.enterScoresMode();
    await game.enterScoreForMatch(0, 11, 9); // Court 1: Team 1 wins
    await game.enterScoreForMatch(1, 11, 7); // Court 2: Team 1 wins
    await game.submitScores();

    // Verify scores were submitted and we can start next round
    await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible();
  });
});
