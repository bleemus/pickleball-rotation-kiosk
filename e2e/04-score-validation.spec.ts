import { test, expect } from './fixtures';
import { GamePage } from './helpers';

test.describe('Score Entry Validation', () => {
  test('validates score entry rules', async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup game
    await game.addMultiplePlayers(['Alice', 'Bob', 'Charlie', 'Dave']);
    // Decrement to 1 court
    await game.decrementCourts();
    await game.startGame();

    // Enter scores
    await game.enterScoresMode();

    // Try entering tie scores (should be rejected)
    const allInputs = await page.locator('input[type="number"]').all();
    const inputs = [];
    for (const input of allInputs) {
      if (await input.isVisible()) {
        inputs.push(input);
      }
    }

    await inputs[0].pressSequentially('11', { delay: 50 });
    await inputs[1].pressSequentially('11', { delay: 50 }); // Same score
    await page.click('button:has-text("Submit Scores")');

    // Should show tie error
    await expect(page.locator('text=Tie scores are not allowed')).toBeVisible();

    // Fix the scores
    await inputs[1].clear();
    await inputs[1].pressSequentially('9', { delay: 50 });
    await page.click('button:has-text("Submit Scores")');

    // Should succeed and return to matchups
    await expect(page.locator('text=Start Next Round')).toBeVisible({ timeout: 3000 });
  });

  test('requires both team scores if one is entered', async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup game
    await game.addMultiplePlayers(['Alice', 'Bob', 'Charlie', 'Dave']);
    await game.decrementCourts();
    await game.startGame();

    // Enter scores
    await game.enterScoresMode();

    // Enter only one team's score
    const allInputs = await page.locator('input[type="number"]').all();
    const inputs = [];
    for (const input of allInputs) {
      if (await input.isVisible()) {
        inputs.push(input);
      }
    }

    await inputs[0].pressSequentially('11', { delay: 50 });
    // Leave second input empty
    await page.click('button:has-text("Submit Scores")');

    // Should show error about needing both scores
    await expect(page.locator('text=Please enter scores for both teams')).toBeVisible();
  });

  test('allows partial score submission', async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup game with 2 courts
    await game.addMultiplePlayers(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi']);
    await game.startGame();

    // Enter scores
    await game.enterScoresMode();

    // Only enter scores for first match, leave second empty
    const allInputs = await page.locator('input[type="number"]').all();
    const inputs = [];
    for (const input of allInputs) {
      if (await input.isVisible()) {
        inputs.push(input);
      }
    }

    await inputs[0].pressSequentially('11', { delay: 50 });
    await inputs[1].pressSequentially('9', { delay: 50 });
    // Leave court 2 inputs empty
    await page.click('button:has-text("Submit Scores")');

    // Should succeed with partial scores
    await expect(page.locator('text=Round 1')).toBeVisible();

    // Should show "Edit Scores" since some scores are entered
    await expect(page.locator('button:has-text("Edit Scores")')).toBeVisible();
  });

  test('validates numeric input only', async ({ page, cleanState }) => {
    const game = new GamePage(page);
    await game.goto();

    // Setup game
    await game.addMultiplePlayers(['Alice', 'Bob', 'Charlie', 'Dave']);
    await game.decrementCourts();
    await game.startGame();

    // Enter scores
    await game.enterScoresMode();

    // Try typing non-numeric characters
    const allInputs = await page.locator('input[type="number"]').all();
    const inputs = [];
    for (const input of allInputs) {
      if (await input.isVisible()) {
        inputs.push(input);
      }
    }

    await inputs[0].type('abc123def');

    // Input should only contain numbers
    const value = await inputs[0].inputValue();
    expect(value).toMatch(/^[0-9]*$/);
  });
});
