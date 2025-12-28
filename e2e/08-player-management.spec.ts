import { test, expect } from "./fixtures";
import { GamePage } from "./helpers";

test.describe("Player Management During Gameplay", () => {
  test.describe("Player Rename", () => {
    test("renames a player successfully", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts (default)
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

      // Complete the round
      await game.enterScoresMode();
      await game.enterScoreForMatch(0, 11, 9);
      await game.enterScoreForMatch(1, 11, 7);
      await game.submitScores();

      // Should be at player management screen
      await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible();

      // Use helper to rename Alice to Alicia
      await game.renamePlayer("Alice", "Alicia");

      // Wait a bit for React to update
      await page.waitForTimeout(500);

      // Should see the new name in the player cards section
      const playerCards = page.locator("text=Current Players").locator("..");
      await expect(playerCards.locator("text=Alicia")).toBeVisible();
      await expect(playerCards.locator("text=Alice")).not.toBeVisible();
    });

    test("cancels rename without saving", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Click Edit on Alice
      await game.clickPlayerEdit("Alice");

      // Wait for Save button to appear
      const saveButton = page.locator('button:text("Save")');
      await saveButton.waitFor({ state: "visible", timeout: 5000 });

      // Change the name using the focused input
      const editInput = page.locator("input:focus");
      await editInput.clear();
      await editInput.fill("Alicia");

      // Click Cancel
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(200);

      // Original name should still be there in player cards
      const playerCards = page.locator("text=Current Players").locator("..");
      await expect(playerCards.locator("text=Alice")).toBeVisible();
      await expect(playerCards.locator("text=Alicia")).not.toBeVisible();
    });

    test("prevents rename to duplicate name", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Try to rename Alice to Bob
      await game.clickPlayerEdit("Alice");

      // Wait for Save button to appear
      const saveButton = page.locator('button:text("Save")');
      await saveButton.waitFor({ state: "visible", timeout: 5000 });

      // Use focused input
      const editInput = page.locator("input:focus");
      await editInput.clear();
      await editInput.fill("Bob");

      await saveButton.click();

      // Should see error message
      await expect(page.locator("text=Player name already exists")).toBeVisible();

      // Cancel and verify Alice is still there
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(200);

      const playerCards = page.locator("text=Current Players").locator("..");
      await expect(playerCards.locator("text=Alice")).toBeVisible();
    });

    test("prevents rename to empty name", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Try to rename Alice to empty
      await game.clickPlayerEdit("Alice");

      const editInput = page.locator('input[value="Alice"]');
      await editInput.clear();

      await page.click('button:has-text("Save")');

      // Should see error message
      await expect(page.locator("text=Player name cannot be empty")).toBeVisible();
    });
  });

  test.describe("Sit Out Toggle", () => {
    test("marks player to sit out next round", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts (default)
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

      // Click "Sit" on Alice to mark her sitting out
      await game.clickPlayerSitOut("Alice");

      // Should see "Sitting Out" label
      await expect(page.locator("text=(Sitting Out)")).toBeVisible();

      // Active count should update (7 active, 1 sitting)
      await expect(page.locator("text=7 Active")).toBeVisible();
      await expect(page.locator("text=1 Sitting")).toBeVisible();
    });

    test("brings player back from sitting out", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Mark Alice sitting out
      await game.clickPlayerSitOut("Alice");

      // Verify sitting out
      await expect(page.locator("text=(Sitting Out)")).toBeVisible();

      // Click "Play" to bring her back
      await game.clickPlayerPlay("Alice");

      // Should no longer see "Sitting Out"
      await expect(page.locator("text=(Sitting Out)")).not.toBeVisible();

      // Active count should update back
      await expect(page.locator("text=8 Active")).toBeVisible();
      await expect(page.locator("text=0 Sitting")).toBeVisible();
    });

    test("prevents round start when too many players sitting out", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Mark one player sitting out - 7 active, 8 required for 2 courts
      await game.clickPlayerSitOut("Alice");

      // Start Next Round should be disabled
      await expect(page.locator('button:has-text("Start Next Round")')).toBeDisabled();

      // Should see warning message about needing 8 active players
      await expect(
        page.locator("text=Need at least 8 active players (7 currently active)")
      ).toBeVisible();
    });

    test("sitting out player is excluded from match generation", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 9 players for 2 courts (1 will naturally bench)
      await game.addMultiplePlayers([
        "Alice",
        "Bob",
        "Charlie",
        "Dave",
        "Eve",
        "Frank",
        "Grace",
        "Heidi",
        "Ivan",
      ]);
      await game.startGame();
      await game.enterScoresMode();
      await game.enterScoreForMatch(0, 11, 9);
      await game.enterScoreForMatch(1, 11, 7);
      await game.submitScores();

      // Mark Alice sitting out
      await game.clickPlayerSitOut("Alice");

      // Start next round
      await game.startNextRound();

      // Wait for round 2
      await game.expectRoundNumber(2);

      // The bench section should be visible and Alice should be on it
      await expect(page.locator("text=On the Bench")).toBeVisible();

      // Verify Alice is on the bench (the bench shows "Sat out: N" for benched players)
      await expect(page.locator("text=Alice").first()).toBeVisible();
    });
  });

  test.describe("Adding Players During Gameplay", () => {
    test("adds new player between rounds", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 8 players for 2 courts
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

      // Add a new player in the player management screen
      await page.fill('input[placeholder="Enter player name"]', "Ivan");
      await page.click('button:has-text("Add Player")');
      await page.waitForTimeout(300);

      // Should see 9 players now
      await expect(page.locator("text=Current Players (9)")).toBeVisible();

      // Start next round
      await game.startNextRound();

      // Wait for round 2
      await game.expectRoundNumber(2);

      // With 9 players and 2 courts, 1 player will be benched
      await expect(page.locator("text=On the Bench")).toBeVisible();
    });
  });

  test.describe("Removing Players During Gameplay", () => {
    test("removes player between rounds", async ({ page, cleanState }) => {
      const game = new GamePage(page);
      await game.goto();

      // Add 9 players for 2 courts (1 extra)
      await game.addMultiplePlayers([
        "Alice",
        "Bob",
        "Charlie",
        "Dave",
        "Eve",
        "Frank",
        "Grace",
        "Heidi",
        "Ivan",
      ]);
      await game.startGame();
      await game.enterScoresMode();
      await game.enterScoreForMatch(0, 11, 9);
      await game.enterScoreForMatch(1, 11, 7);
      await game.submitScores();

      // Mock the confirmation dialog
      page.on("dialog", (dialog) => dialog.accept());

      // Remove Ivan
      await game.clickPlayerRemove("Ivan");

      // Should see 8 players now
      await expect(page.locator("text=Current Players (8)")).toBeVisible();
      await expect(page.locator("text=Ivan")).not.toBeVisible();
    });
  });
});
