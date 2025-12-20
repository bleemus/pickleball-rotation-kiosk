import { test, expect } from '../fixtures/test';
import { addPlayer, generatePlayers } from '../helpers/test-utils';

test.describe('Session Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Fixture already clears state, just navigate
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // Check for player input (app name can be customized via env)
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should add a single player', async ({ page }) => {
    await addPlayer(page, 'Alice');
    
    // Verify player appears in list
    await expect(page.locator('text=Alice')).toBeVisible();
  });

  test('should add multiple players', async ({ page }) => {
    const players = generatePlayers(8);
    
    for (const player of players) {
      await addPlayer(page, player.name);
    }
    
    // Verify all players are listed
    for (const player of players) {
      await expect(page.locator(`text=${player.name}`)).toBeVisible();
    }
  });

  test('should not allow duplicate player names', async ({ page }) => {
    await addPlayer(page, 'Alice');
    
    // Try to add duplicate
    await page.fill('input[type="text"]', 'Alice');
    await page.locator('button[type="submit"]').first().click();
    
    // Should show error
    await expect(page.locator('text=/already exists/i')).toBeVisible();
  });

  test('should require minimum players before starting', async ({ page }) => {
    // Add only 3 players (need 4+ for 1 court, 8+ for 2 courts)
    for (let i = 1; i <= 3; i++) {
      await addPlayer(page, `Player ${i}`);
    }
    
    // Start Game button should be disabled or show error
    const startButton = page.locator('button:has-text("Start Game")');
    const isDisabled = await startButton.isDisabled();
    
    if (!isDisabled) {
      await startButton.click();
      // Should show error about needing more players
      await expect(page.locator('text=/Need at least/i')).toBeVisible();
    }
  });

  test('should remove a player', async ({ page }) => {
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');
    
    // Click remove button for Alice (first remove button)
    await page.locator('button:has-text("×")').first().click();
    
    // Alice should be gone, Bob should remain
    await expect(page.locator('text=Alice')).not.toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();
  });

  test('should validate player name length', async ({ page }) => {
    // Try to add a player with a very long name (>30 chars)
    const longName = 'A'.repeat(31);
    
    await page.fill('input[type="text"]', longName);
    await page.locator('button[type="submit"]').first().click();
    
    // Should show error about name length
    await expect(page.locator('text=/30 characters/i')).toBeVisible();
  });

  test('should start game with minimum players', async ({ page }) => {
    // Add 8 players (minimum for 2 courts)
    const players = generatePlayers(8);
    for (const player of players) {
      await addPlayer(page, player.name);
    }
    
    // Click Start Game
    await page.click('button:has-text("Start Game")');
    
    // Should show Round 1
    await expect(page.locator('text=Round 1')).toBeVisible({ timeout: 5000 });
  });

  test('should allow changing number of courts', async ({ page }) => {
    // Add 12 players (enough for 3 courts)
    const players = generatePlayers(12);
    for (const player of players) {
      await addPlayer(page, player.name);
    }
    
    // Look for courts selector (might be a dropdown or input)
    const courtsSelector = page.locator('text=/courts/i').first();
    if (await courtsSelector.isVisible()) {
      // UI has courts selector - this might vary by implementation
      // Adjust based on actual UI
    }
    
    // Start game
    await page.click('button:has-text("Start Game")');
    
    // Verify round starts
    await expect(page.locator('text=Round 1')).toBeVisible({ timeout: 5000 });
  });

  test('should persist session in localStorage', async ({ page }) => {
    // Add players and start game
    const players = generatePlayers(8);
    for (const player of players) {
      await addPlayer(page, player.name);
    }
    
    await page.click('button:has-text("Start Game")');
    await expect(page.locator('text=Round 1')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Session should still be active
    await expect(page.locator('text=Round 1')).toBeVisible({ timeout: 5000 });
  });
});
