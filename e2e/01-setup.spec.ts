import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Game Setup", () => {
  test("should initialize game with players and start first round", async ({
    page,
    cleanState,
  }) => {
    const game = new GamePage(page);
    await game.goto();

    // Verify initial empty state
    await game.expectNoPlayersMessage();
    await game.expectStartGameDisabled();

    // Add 8 players for 2 courts
    const players = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi"];
    await game.addMultiplePlayers(players);

    // Verify all players were added
    for (const player of players) {
      await game.expectPlayerInList(player);
    }

    // Verify player count is displayed
    await expect(page.locator("text=Players (8)")).toBeVisible();

    // Start button should now be enabled
    await game.expectStartGameEnabled();

    // Start the game
    await game.startGame();

    // Verify Round 1 is displayed
    await game.expectRoundNumber(1);

    // Verify 2 courts are displayed
    await game.expectCourtNumber(1);
    await game.expectCourtNumber(2);

    // Verify teams are assigned (4 players per court, 2 courts = 8 players total)
    // At least one court should have player assignments visible
    await expect(page.locator("text=Court 1").first()).toBeVisible();
    await expect(page.locator("text=Court 2").first()).toBeVisible();
  });

  test("should validate minimum players requirement", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Add only 2 players (need 8 for 2 courts)
    await game.addPlayer("Alice");
    await game.addPlayer("Bob");

    // Start button should be disabled
    await game.expectStartGameDisabled();

    // Should show how many more players are needed
    await expect(page.locator("text=Add 6 more players to start")).toBeVisible();

    // Add 6 more players
    await game.addPlayer("Charlie");
    await game.addPlayer("Dave");
    await game.addPlayer("Eve");
    await game.addPlayer("Frank");
    await game.addPlayer("Grace");
    await game.addPlayer("Heidi");

    // Now start button should be enabled
    await game.expectStartGameEnabled();
  });

  test("should prevent duplicate player names", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Add a player
    await game.addPlayer("Alice");
    await game.expectPlayerInList("Alice");

    // Try to add same player again
    await page.fill('input[placeholder="Enter player name"]', "Alice");
    await page.click('button:has-text("Add")');

    // Should show error message
    await game.expectErrorMessage("Player name already exists");

    // Player count should still be 1
    await expect(page.locator("text=Players (1)")).toBeVisible();
  });

  test("should validate empty player name", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Try to add empty name
    await page.click('button:has-text("Add")');

    // Should show error
    await game.expectErrorMessage("Please enter a player name");

    // Player count should be 0
    await expect(page.locator("text=Players (0)")).toBeVisible();
  });

  test("should allow changing number of courts", async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Default is 2 courts - check player requirement (desktop sidebar shows last)
    await expect(page.locator("text=Need at least 8 players").last()).toBeVisible();

    // Decrement to 1 court
    await game.decrementCourts();
    // Check that need at least 4 players message shows (confirms 1 court)
    await expect(page.locator("text=Need at least 4 players").last()).toBeVisible();

    // Add 4 players for 1 court
    await game.addMultiplePlayers(["Alice", "Bob", "Charlie", "Dave"]);

    // Start button should be enabled
    await game.expectStartGameEnabled();

    // Start game
    await game.startGame();

    // Should show only Court 1
    await game.expectCourtNumber(1);
    await expect(page.locator("text=Court 2")).not.toBeVisible();
  });
});
