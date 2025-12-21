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

    // Get ALL inputs and filter to only visible ones (handles responsive design)
    const allInputs = await this.page.locator('input[type="number"]').all();

    // Filter to only visible inputs
    const visibleInputs = [];
    for (const input of allInputs) {
      const isVisible = await input.isVisible();
      if (isVisible) {
        visibleInputs.push(input);
      }
    }

    // Now get the correct inputs for this match
    const team1Input = visibleInputs[matchIndex * 2];
    const team2Input = visibleInputs[matchIndex * 2 + 1];

    if (!team1Input || !team2Input) {
      throw new Error(
        `Could not find inputs for match ${matchIndex}. Found ${visibleInputs.length} visible inputs.`
      );
    }

    // Use pressSequentially to type character by character
    await team1Input.pressSequentially(team1Score.toString(), { delay: 50 });
    await this.page.waitForTimeout(100); // Small delay between inputs
    await team2Input.pressSequentially(team2Score.toString(), { delay: 50 });
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
    await expect(this.page.locator(`text=Round ${roundNum}`).first()).toBeVisible();
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
}
