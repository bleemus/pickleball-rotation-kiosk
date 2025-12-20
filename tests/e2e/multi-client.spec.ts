import { test, expect } from '../fixtures/test';
import {
  createSession,
  startGame,
  enterAllScores,
  waitForSync,
  completeRound,
} from '../helpers/test-utils';

test.describe('Multi-Client Synchronization', () => {
  test('should sync session across multiple browser tabs', async ({ context }) => {
    // Create two pages (simulating two devices)
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup session in page 1
    await page1.goto('/');
    await createSession(page1, 8);
    await startGame(page1, 2);
    
    // Page 2 should pick up the active session
    await page2.goto('/');
    await waitForSync();
    
    // Page 2 should show the same round
    await expect(page2.locator('text=Round 1')).toBeVisible({ timeout: 10000 });
    
    await page1.close();
    await page2.close();
  });

  test('should handle concurrent score entry', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup session
    await page1.goto('/');
    await createSession(page1, 8);
    await startGame(page1, 2);
    
    // Load same session in page 2
    await page2.goto('/');
    await waitForSync();
    
    // Both pages enter scores at same time
    await Promise.all([
      completeRound(page1, 2),
      (async () => {
        await page2.waitForTimeout(500); // Slight delay
        await completeRound(page2, 2);
      })(),
    ]);
    
    // Wait for sync
    await waitForSync();
    
    // Both should show round 2 (or round 3 if both submissions went through)
    const round1 = await page1.locator('text=/Round \\d+/').first().textContent();
    const round2 = await page2.locator('text=/Round \\d+/').first().textContent();
    
    // They should be synchronized
    expect(round1).toBe(round2);
    
    await page1.close();
    await page2.close();
  });

  test('should update all clients when player added', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup session
    await page1.goto('/');
    await createSession(page1, 8);
    await startGame(page1, 2);
    await completeRound(page1, 2);
    
    // Load in page 2
    await page2.goto('/');
    await waitForSync();
    
    // Add player in page 1
    await page1.fill('input[type="text"]', 'New Player');
    await page1.locator('button[type="submit"]').first().click();
    
    // Wait for sync
    await waitForSync();
    
    // Page 2 should see the new player
    await expect(page2.locator('text=New Player')).toBeVisible({ timeout: 10000 });
    
    await page1.close();
    await page2.close();
  });

  test('should kick users out of score entry when round completed by another client', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup session
    await page1.goto('/');
    await createSession(page1, 8);
    await startGame(page1, 2);
    
    // Load in page 2
    await page2.goto('/');
    await waitForSync();
    
    // Page 2 enters score entry mode
    await page2.click('button:has-text("Enter Scores")');
    await expect(page2.locator('text=Enter Scores')).toBeVisible();
    
    // Page 1 completes the round
    await completeRound(page1, 2);
    
    // Wait for sync
    await waitForSync();
    
    // Page 2 should be kicked back to matchups view
    await expect(page2.locator('text=Court 1')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('text=Round 2')).toBeVisible();
    
    await page1.close();
    await page2.close();
  });

  test('should handle session deletion across clients', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup session
    await page1.goto('/');
    await createSession(page1, 8);
    await startGame(page1, 2);
    
    // Load in page 2
    await page2.goto('/');
    await waitForSync();
    
    // Page 1 resets session
    const resetButton = page1.locator('button:has-text("Reset Session")');
    if (await resetButton.isVisible()) {
      page1.on('dialog', dialog => dialog.accept());
      await resetButton.click();
    }
    
    // Wait for sync
    await waitForSync();
    
    // Page 2 should return to setup (check for player input)
    await expect(page2.locator('input[type="text"]')).toBeVisible({ timeout: 10000 });
    
    await page1.close();
    await page2.close();
  });

  test('should sync spectator view with admin changes', async ({ context }) => {
    const adminPage = await context.newPage();
    const spectatorPage = await context.newPage();
    
    // Setup session in admin
    await adminPage.goto('/');
    await createSession(adminPage, 8);
    await startGame(adminPage, 2);
    
    // Open spectator view
    await spectatorPage.goto('/spectator');
    await waitForSync();
    
    // Verify spectator shows round 1
    await expect(spectatorPage.locator('text=Round 1')).toBeVisible({ timeout: 10000 });
    
    // Complete round in admin
    await completeRound(adminPage, 2);
    
    // Wait for sync
    await waitForSync();
    
    // Spectator should update to round 2
    await expect(spectatorPage.locator('text=Round 2')).toBeVisible({ timeout: 10000 });
    
    await adminPage.close();
    await spectatorPage.close();
  });
});
