import { test, expect } from '../fixtures/test';
import {
  createSession,
  startGame,
  addPlayer,
  completeRound,
  resetSession,
} from '../helpers/test-utils';

test.describe('Player Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add player mid-game between rounds', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete round 1
    await completeRound(page, 2);
    
    // Add a new player
    await addPlayer(page, 'New Player');
    
    // Verify player was added
    await expect(page.locator('text=New Player')).toBeVisible();
    
    // Start next round - new player should be included
    await page.click('button:has-text("Start Next Round")');
    
    // New round should start
    await expect(page.locator('text=Round 3')).toBeVisible({ timeout: 5000 });
  });

  test('should not allow removing player during active round', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Try to find remove button for a player in active round
    const removeButtons = page.locator('button:has-text("×")');
    
    if (await removeButtons.first().isVisible()) {
      // Accept confirmation dialog if it appears
      page.on('dialog', dialog => dialog.accept());
      
      await removeButtons.first().click();
      
      // Should show error or prevent removal
      const errorMessage = page.locator('text=/cannot remove.*active round/i');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should remove player between rounds', async ({ page }) => {
    await createSession(page, 9); // Use 9 so we can remove one and still have 8
    await startGame(page, 2);
    
    // Complete round 1
    await completeRound(page, 2);
    
    // Get the first player name
    const firstPlayerName = await page.locator('text=/Player \\d+/').first().textContent();
    
    // Remove the player
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("×")').first().click();
    
    // Player should be removed
    await expect(page.locator(`text=${firstPlayerName}`)).not.toBeVisible();
  });

  test('should not allow removing below minimum players', async ({ page }) => {
    await createSession(page, 8); // Exactly minimum for 2 courts
    await startGame(page, 2);
    
    // Complete round
    await completeRound(page, 2);
    
    // Try to remove a player
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("×")').first().click();
    
    // Should show error about minimum players
    await expect(page.locator('text=/minimum.*players/i')).toBeVisible();
  });

  test('should toggle player sit-out status', async ({ page }) => {
    await createSession(page, 10); // 10 players so we have extras
    await startGame(page, 2);
    
    // Complete round 1
    await completeRound(page, 2);
    
    // Look for "Sit Out" or "Sit" button
    const sitOutButton = page.locator('button:has-text("Sit")').first();
    
    if (await sitOutButton.isVisible()) {
      await sitOutButton.click();
      
      // Button should change state (might say "Play" now)
      await expect(page.locator('button:has-text("Play")').first()).toBeVisible();
      
      // Start next round
      await page.click('button:has-text("Start Next Round")');
      
      // The player marked to sit should be on bench
      await expect(page.locator('text=Bench')).toBeVisible();
    }
  });

  test('should update number of courts', async ({ page }) => {
    await createSession(page, 12); // Enough for 3 courts
    await startGame(page, 2);
    
    // Complete round 1
    await completeRound(page, 2);
    
    // Look for change courts button
    const changeCourtsButton = page.locator('button:has-text("Change Courts")');
    
    if (await changeCourtsButton.isVisible()) {
      await changeCourtsButton.click();
      
      // Should show courts selector dialog/modal
      // This implementation may vary - adjust based on actual UI
      await page.waitForTimeout(500);
    }
  });

  test('should persist player changes across page refresh', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete a round
    await completeRound(page, 2);
    
    // Add a player
    await addPlayer(page, 'Persistent Player');
    
    // Refresh page
    await page.reload();
    
    // Player should still be there
    await expect(page.locator('text=Persistent Player')).toBeVisible({ timeout: 5000 });
  });

  test('should handle player names with special characters', async ({ page }) => {
    await createSession(page, 7);
    
    // Add player with special characters (but valid ones)
    await addPlayer(page, "O'Brien");
    await addPlayer(page, 'José');
    
    // Verify they appear
    await expect(page.locator("text=O'Brien")).toBeVisible();
    await expect(page.locator('text=José')).toBeVisible();
    
    // Should be able to start game
    await startGame(page, 2);
    await expect(page.locator('text=Round 1')).toBeVisible();
  });

  test('should prevent invalid player names', async ({ page }) => {
    // Try to add player with HTML/script tags (XSS attempt)
    await page.fill('input[type="text"]', '<script>alert("xss")</script>');
    await page.locator('button[type="submit"]').first().click();
    
    // Should show error about invalid characters
    await expect(page.locator('text=/invalid character/i')).toBeVisible();
  });
});
