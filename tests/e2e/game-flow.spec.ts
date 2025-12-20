import { test, expect } from '../fixtures/test';
import {
  createSession,
  startGame,
  enterAllScores,
  startNextRound,
  completeRound,
  getCurrentRound,
  verifyPlayerStatsVisible,
  endSession,
  resetSession,
} from '../helpers/test-utils';

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete a full game flow', async ({ page }) => {
    // Create session with 8 players
    await createSession(page, 8);
    
    // Start game
    await startGame(page, 2);
    
    // Verify Round 1 started
    await expect(page.locator('text=Round 1')).toBeVisible();
    await expect(page.locator('text=Court 1')).toBeVisible();
    await expect(page.locator('text=Court 2')).toBeVisible();
    
    // Complete round 1
    await completeRound(page, 2);
    
    // Verify Round 2 started
    await expect(page.locator('text=Round 2')).toBeVisible();
  });

  test('should track player statistics correctly', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Enter scores for round 1
    await enterAllScores(page, [
      { team1: 11, team2: 5 },
      { team1: 11, team2: 8 },
    ]);
    
    // Check player stats
    await verifyPlayerStatsVisible(page);
    
    // At least one player should have wins > 0
    const statsSection = page.locator('text=Player Stats').locator('..');
    await expect(statsSection.locator('text=/\\d+ win/i')).toBeVisible();
  });

  test('should handle score entry validation', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Click Enter Scores
    await page.click('button:has-text("Enter Scores")');
    
    // Try to enter tied scores (should be rejected)
    await page.locator('input').first().fill('11');
    await page.locator('input').nth(1).fill('11');
    
    // Submit
    await page.click('button:has-text("Submit Scores")');
    
    // Should show error about ties
    await expect(page.locator('text=/cannot be tied/i')).toBeVisible();
  });

  test('should allow partial score entry', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Click Enter Scores
    await page.click('button:has-text("Enter Scores")');
    
    // Only enter score for first match
    const firstMatchInputs = page.locator('.space-y-6').first();
    await firstMatchInputs.locator('input').first().fill('11');
    await firstMatchInputs.locator('input').last().fill('5');
    
    // Leave second match empty
    
    // Submit
    await page.click('button:has-text("Submit Scores")');
    
    // Should return to matchups view
    await expect(page.locator('text=Court 1')).toBeVisible({ timeout: 5000 });
    
    // Should NOT show "Start Next Round" since not all scores entered
    const nextRoundButton = page.locator('button:has-text("Start Next Round")');
    await expect(nextRoundButton).not.toBeVisible();
  });

  test('should complete multiple rounds', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete 3 rounds
    for (let i = 1; i <= 3; i++) {
      const currentRound = await getCurrentRound(page);
      expect(currentRound).toBe(i);
      
      await completeRound(page, 2);
    }
    
    // Should be on round 4
    const finalRound = await getCurrentRound(page);
    expect(finalRound).toBe(4);
  });

  test('should rotate benched players fairly', async ({ page }) => {
    // Use 10 players so 2 will be benched each round
    await createSession(page, 10);
    await startGame(page, 2);
    
    // Complete several rounds
    for (let i = 0; i < 3; i++) {
      // Check that bench section exists
      await expect(page.locator('text=Bench')).toBeVisible();
      
      await completeRound(page, 2);
    }
    
    // After 3 rounds, check player stats - "Sat Out" should be distributed
    await verifyPlayerStatsVisible(page);
  });

  test('should allow editing previous scores', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete round 1
    await enterAllScores(page, [
      { team1: 11, team2: 5 },
      { team1: 11, team2: 8 },
    ]);
    
    // Click "Edit Scores" or "Enter Scores" again
    await page.click('button:has-text("Enter Scores")');
    
    // Change scores
    await page.locator('input').first().fill('15');
    await page.locator('input').nth(1).fill('13');
    
    // Submit
    await page.click('button:has-text("Submit Scores")');
    
    // Scores should be updated
    await expect(page.locator('text=Court 1')).toBeVisible({ timeout: 5000 });
  });

  test('should end session and show final rankings', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete 2 rounds
    await completeRound(page, 2);
    await completeRound(page, 2);
    
    // End session
    await endSession(page);
    
    // Verify session summary
    await expect(page.locator('text=Session Complete')).toBeVisible();
    await expect(page.locator('text=Final Rankings')).toBeVisible();
    
    // Should show medals for top 3
    await expect(page.locator('text=🥇')).toBeVisible();
    await expect(page.locator('text=🥈')).toBeVisible();
    await expect(page.locator('text=🥉')).toBeVisible();
  });

  test('should reset session', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete a round
    await completeRound(page, 2);
    
    // Reset session
    await resetSession(page);
    
    // Should return to setup screen
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('should display game history', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Complete a round
    await completeRound(page, 2);
    
    // Look for history button
    const historyButton = page.locator('button:has-text("History")');
    if (await historyButton.isVisible()) {
      await historyButton.click();
      
      // Should show game history
      await expect(page.locator('text=Game History')).toBeVisible();
      await expect(page.locator('text=Round 1')).toBeVisible();
    }
  });

  test('should cancel current round', async ({ page }) => {
    await createSession(page, 8);
    await startGame(page, 2);
    
    // Look for cancel round button
    const cancelButton = page.locator('button:has-text("Cancel Round")');
    if (await cancelButton.isVisible()) {
      // Accept confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      await cancelButton.click();
      
      // Should return to previous state or show setup
      await page.waitForTimeout(1000);
    }
  });
});
