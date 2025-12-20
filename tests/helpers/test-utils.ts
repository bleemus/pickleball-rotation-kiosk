import { Page, expect } from '@playwright/test';

/**
 * Test utility functions for Pickleball Kiosk E2E tests
 */

export interface TestPlayer {
  name: string;
}

/**
 * Generates test player names
 */
export function generatePlayers(count: number, prefix = 'Player'): TestPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${i + 1}`
  }));
}

/**
 * Adds a single player to the session
 */
export async function addPlayer(page: Page, playerName: string): Promise<void> {
  await page.fill('input[type="text"]', playerName);
  // Use button type="submit" since button text varies (PlayerSetup uses "Add", PlayerManager uses "Add Player")
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  
  // Wait for player to appear in the list
  await expect(page.locator(`text=${playerName}`)).toBeVisible();
}

/**
 * Adds multiple players to the session
 */
export async function addPlayers(page: Page, players: TestPlayer[]): Promise<void> {
  for (const player of players) {
    await addPlayer(page, player.name);
  }
}

/**
 * Creates a session with the specified number of players
 */
export async function createSession(page: Page, numPlayers: number = 8): Promise<void> {
  // Navigate to home page
  await page.goto('/');
  
  // Wait for page to load (check for player input which is always present)
  await expect(page.locator('input[type="text"]')).toBeVisible();
  
  // Add players
  const players = generatePlayers(numPlayers);
  await addPlayers(page, players);
  
  // Verify all players added
  await expect(page.locator('text=Start Game')).toBeEnabled();
}

/**
 * Starts a game with the current players
 */
export async function startGame(page: Page, numCourts: number = 2): Promise<void> {
  // Click Start Game button
  await page.click('button:has-text("Start Game")');
  
  // Wait for round to start
  await expect(page.locator('text=Round 1')).toBeVisible({ timeout: 5000 });
  
  // Verify courts are displayed
  for (let i = 1; i <= numCourts; i++) {
    await expect(page.locator(`text=Court ${i}`)).toBeVisible();
  }
}

/**
 * Enters scores for a specific match
 */
export async function enterMatchScore(
  page: Page,
  matchIndex: number,
  team1Score: number,
  team2Score: number
): Promise<void> {
  // Find the score inputs for this match
  const matchInputs = page.locator('.space-y-6').nth(matchIndex);
  
  // Fill team 1 score
  await matchInputs.locator('input').first().fill(String(team1Score));
  
  // Fill team 2 score  
  await matchInputs.locator('input').last().fill(String(team2Score));
}

/**
 * Enters scores for all matches in the current round
 */
export async function enterAllScores(
  page: Page,
  scores: Array<{ team1: number; team2: number }>
): Promise<void> {
  // Click Enter Scores button
  await page.click('button:has-text("Enter Scores")');
  
  // Wait for score entry form
  await expect(page.locator('text=Enter Scores')).toBeVisible();
  
  // Enter scores for each match
  for (let i = 0; i < scores.length; i++) {
    await enterMatchScore(page, i, scores[i].team1, scores[i].team2);
  }
  
  // Submit scores
  await page.click('button:has-text("Submit Scores")');
  
  // Wait for return to matchups screen
  await expect(page.locator('button:has-text("Start Next Round")')).toBeVisible({ timeout: 5000 });
}

/**
 * Starts the next round
 */
export async function startNextRound(page: Page): Promise<void> {
  await page.click('button:has-text("Start Next Round")');
  
  // Wait for new round to load
  await page.waitForTimeout(1000);
}

/**
 * Completes a full round (enter scores and start next round)
 */
export async function completeRound(
  page: Page,
  numCourts: number = 2
): Promise<void> {
  // Generate random scores
  const scores = Array.from({ length: numCourts }, () => ({
    team1: Math.floor(Math.random() * 6) + 11, // 11-16
    team2: Math.floor(Math.random() * 10) + 1, // 1-10
  }));
  
  await enterAllScores(page, scores);
  await startNextRound(page);
}

/**
 * Opens the spectator view in a new page
 */
export async function openSpectatorView(page: Page): Promise<Page> {
  const context = page.context();
  const spectatorPage = await context.newPage();
  await spectatorPage.goto('/spectator');
  
  // Wait for spectator page to load
  await spectatorPage.waitForLoadState('networkidle');
  
  return spectatorPage;
}

/**
 * Waits for session to sync across pages (polling delay)
 */
export async function waitForSync(timeMs: number = 2500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeMs));
}

/**
 * Resets the session
 */
export async function resetSession(page: Page): Promise<void> {
  // Click reset button (if visible)
  const resetButton = page.locator('button:has-text("Reset Session")');
  if (await resetButton.isVisible()) {
    await resetButton.click();
    
    // Confirm reset
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for return to setup (check for player input)
    await expect(page.locator('input[type="text"]')).toBeVisible();
  }
}

/**
 * Gets the current round number from the page
 */
export async function getCurrentRound(page: Page): Promise<number> {
  const roundText = await page.locator('text=/Round \\d+/').first().textContent();
  const match = roundText?.match(/Round (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Verifies player stats are visible
 */
export async function verifyPlayerStatsVisible(page: Page): Promise<void> {
  await expect(page.locator('text=Player Stats')).toBeVisible();
  await expect(page.locator('text=Wins')).toBeVisible();
  await expect(page.locator('text=Losses')).toBeVisible();
}

/**
 * Ends the current session
 */
export async function endSession(page: Page): Promise<void> {
  // Look for End Session button
  const endButton = page.locator('button:has-text("End Session")');
  if (await endButton.isVisible()) {
    // Click and confirm
    page.on('dialog', dialog => dialog.accept());
    await endButton.click();
    
    // Wait for session summary
    await expect(page.locator('text=Session Complete')).toBeVisible({ timeout: 5000 });
  }
}
