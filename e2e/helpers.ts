import { Page, expect, Locator } from "@playwright/test";

export class GamePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation
  async goto() {
    await this.page.goto("/");
  }

  // Player Setup Actions
  async addPlayer(name: string) {
    await this.page.fill('input[placeholder="Enter player name"]', name);
    await this.page.click('button:has-text("Add")');
    // Wait a bit for the player to be added
    await this.page.waitForTimeout(100);
  }

  async addMultiplePlayers(names: string[]) {
    for (const name of names) {
      await this.addPlayer(name);
    }
  }

  async removePlayer(playerName: string) {
    const playerElement = this.page.locator(`text=${playerName}`).first();
    const removeButton = playerElement.locator("..").locator('button:has-text("✕")');
    await removeButton.click();
  }

  async incrementCourts() {
    // Get all increment buttons and click the visible one (handles responsive design)
    const incrementButtons = await this.page.locator('button:has-text("+")').all();
    for (const button of incrementButtons) {
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(100);
        return;
      }
    }
    throw new Error("No visible increment button found");
  }

  async decrementCourts() {
    // Get all decrement buttons and click the visible one (handles responsive design)
    const decrementButtons = await this.page.locator('button:has-text("−")').all();
    for (const button of decrementButtons) {
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(100);
        return;
      }
    }
    throw new Error("No visible decrement button found");
  }

  async startGame() {
    await this.page.click('button:has-text("Start Game")');
    // Wait for round to be generated
    await this.page.waitForTimeout(500);
  }

  // Score Entry Actions
  async enterScoreForMatch(matchIndex: number, team1Score: number, team2Score: number) {
    // Wait for score inputs to be in DOM
    await this.page.waitForSelector('input[type="number"]', { state: "attached", timeout: 5000 });

    // Use Playwright's built-in filter to get only visible number inputs
    const visibleInputs = this.page.locator('input[type="number"]:visible');

    // Get the specific inputs for this match
    const team1Input = visibleInputs.nth(matchIndex * 2);
    const team2Input = visibleInputs.nth(matchIndex * 2 + 1);

    // Clear existing values and fill with new scores
    await team1Input.clear();
    await team1Input.fill(team1Score.toString());
    await this.page.waitForTimeout(100); // Small delay between inputs
    await team2Input.clear();
    await team2Input.fill(team2Score.toString());
    await this.page.waitForTimeout(100); // Small delay after entering match scores
  }

  async submitScores() {
    await this.page.click('button:has-text("Submit Scores")');
    await this.page.waitForTimeout(300);
  }

  async startNextRound() {
    await this.page.click('button:has-text("Start Next Round")');
    await this.page.waitForTimeout(500);
  }

  async enterScoresMode() {
    await this.page.click('button:has-text("Enter Scores")');
    // Wait for score input fields to appear and be editable
    await this.page.waitForTimeout(500); // Allow transition to complete
    await this.page
      .locator('input[type="number"]')
      .first()
      .waitFor({ state: "attached", timeout: 5000 });
  }

  // Assertions
  async expectPlayerInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible();
  }

  async expectRoundNumber(roundNum: number) {
    await expect(this.page.locator(`text=Round ${roundNum}`).first()).toBeVisible({ timeout: 10000 });
  }

  async expectCourtNumber(courtNum: number) {
    await expect(this.page.locator(`text=Court ${courtNum}`).first()).toBeVisible();
  }

  async expectStartGameEnabled() {
    const button = this.page.locator('button:has-text("Start Game")');
    await expect(button).toBeEnabled();
  }

  async expectStartGameDisabled() {
    const button = this.page.locator('button:has-text("Start Game")');
    await expect(button).toBeDisabled();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  async expectNoPlayersMessage() {
    await expect(this.page.locator("text=No players added yet")).toBeVisible();
  }

  async expectMatchScore(team1Score: number, team2Score: number) {
    await expect(this.page.locator(`text=${team1Score}`)).toBeVisible();
    await expect(this.page.locator(`text=${team2Score}`)).toBeVisible();
  }

  // Court Selector Actions
  async openCourtSelector() {
    // Get all "Change Courts" buttons and click the visible one (handles responsive design)
    const buttons = await this.page.locator('button:has-text("Change Courts")').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(200);
        return;
      }
    }
    throw new Error("No visible 'Change Courts' button found");
  }

  async closeCourtSelector() {
    // Get all "Hide Courts" buttons and click the visible one (handles responsive design)
    const buttons = await this.page.locator('button:has-text("Hide Courts")').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(200);
        return;
      }
    }
    throw new Error("No visible 'Hide Courts' button found");
  }

  async setNumCourts(numCourts: number) {
    // Get the court selector popup
    const courtSelector = this.page.locator('text=Number of Courts').locator('..');

    // Get current court count from the large number display
    const currentCountText = await courtSelector.locator('.text-5xl').textContent();
    const currentCount = parseInt(currentCountText || '1', 10);

    const diff = numCourts - currentCount;

    if (diff > 0) {
      // Need to increment
      for (let i = 0; i < diff; i++) {
        await this.incrementCourts();
      }
    } else if (diff < 0) {
      // Need to decrement
      for (let i = 0; i < Math.abs(diff); i++) {
        await this.decrementCourts();
      }
    }

    // Wait for the final API call to complete (session update)
    if (diff !== 0) {
      await this.page.waitForResponse(
        (response) => response.url().includes('/session/') && response.status() === 200,
        { timeout: 5000 }
      );
      // Small delay for UI to update
      await this.page.waitForTimeout(200);
    }
  }

  // Court Selector Assertions
  async expectCourtSelectorVisible() {
    await expect(this.page.locator('text=Number of Courts').first()).toBeVisible();
  }

  async expectCourtSelectorNotVisible() {
    await expect(this.page.locator('text=Number of Courts')).not.toBeVisible();
  }

  async expectCourtNotVisible(courtNum: number) {
    await expect(this.page.locator(`text=Court ${courtNum}`)).not.toBeVisible();
  }

  async expectPlayerManagerVisible() {
    await expect(this.page.locator('button:has-text("Start Next Round")')).toBeVisible();
  }

  async expectChangeCourtsButtonVisible() {
    // Check if at least one "Change Courts" button is visible (handles responsive design)
    const buttons = await this.page.locator('button:has-text("Change Courts")').all();
    let anyVisible = false;
    for (const button of buttons) {
      if (await button.isVisible()) {
        anyVisible = true;
        break;
      }
    }
    expect(anyVisible, "Expected at least one 'Change Courts' button to be visible").toBe(true);
  }

  async expectChangeCourtsButtonNotVisible() {
    // Check that NO "Change Courts" buttons are visible (handles responsive design)
    const buttons = await this.page.locator('button:has-text("Change Courts")').all();
    for (const button of buttons) {
      await expect(button).not.toBeVisible();
    }
  }
}
