import { Reservation } from "../types/reservation";

/**
 * Parses a Pickle Planner reservation email and extracts reservation details
 */
export class EmailParser {
  /**
   * Extracts reservation information from email text
   */
  parseReservation(emailText: string, emailSubject: string): Reservation | null {
    try {
      // Check if this is a Rally Club Reservation email
      if (
        !emailSubject.includes("Rally Club Reservation") &&
        !emailText.includes("Rally Club Reservation")
      ) {
        return null;
      }

      const reservation: Partial<Reservation> = {
        id: this.generateId(),
        createdAt: new Date(),
        rawEmail: emailText,
      };

      // Extract date (e.g., "December 17")
      const dateMatch = emailText.match(
        /(?:December|January|February|March|April|May|June|July|August|September|October|November)\s+(\d{1,2})/i
      );
      if (dateMatch) {
        const month = dateMatch[0].split(" ")[0];
        const day = parseInt(dateMatch[1]);
        const year = new Date().getFullYear();
        reservation.date = this.parseDate(month, day, year);
      }

      // Extract time (e.g., "5:30 - 7:00am")
      const timeMatch = emailText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(am|pm)/i);
      if (timeMatch) {
        reservation.startTime = timeMatch[1] + timeMatch[3].toLowerCase();
        reservation.endTime = timeMatch[2] + timeMatch[3].toLowerCase();
      }

      // Extract court location (e.g., "North", "South")
      const courtMatch = emailText.match(/\d{1,2}:\d{2}(am|pm)\s*\n\s*([A-Za-z]+)/i);
      if (courtMatch) {
        reservation.court = courtMatch[2].trim();
      }

      // Extract organizer (e.g., "Joseph Arcilla's Reservation")
      const organizerMatch = emailText.match(/([A-Za-z\s]+)'s Reservation/i);
      if (organizerMatch) {
        reservation.organizer = organizerMatch[1].trim();
      }

      // Extract players
      // Look for "Players" section followed by bullet points or names
      const playersSection = emailText.match(/Players[\s\S]*?(?=Reservation Fee|Fee Breakdown|$)/i);
      if (playersSection) {
        const playerNames: string[] = [];
        const lines = playersSection[0].split("\n");

        for (const line of lines) {
          // Match lines that look like player names
          // Typically format: "Joseph Arcilla" or "• Joseph Arcilla" or "- Joseph Arcilla"
          const cleaned = line.trim().replace(/^[•\-\*]\s*/, "");

          // Skip header lines or lines with no alphabetic characters
          if (
            cleaned &&
            cleaned !== "Players" &&
            /^[A-Za-z\s\'-]+$/.test(cleaned) &&
            cleaned.split(" ").length >= 2 &&
            cleaned.length > 3 &&
            cleaned.length < 50
          ) {
            playerNames.push(cleaned);
          }
        }

        reservation.players = playerNames;
      }

      // Validate we have minimum required fields
      if (
        !reservation.date ||
        !reservation.startTime ||
        !reservation.players ||
        reservation.players.length === 0
      ) {
        console.warn("Incomplete reservation data:", reservation);
        return null;
      }

      return reservation as Reservation;
    } catch (error) {
      console.error("Error parsing reservation email:", error);
      return null;
    }
  }

  /**
   * Generate a unique ID for the reservation
   */
  private generateId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse month name and day into a Date object
   */
  private parseDate(monthName: string, day: number, year: number): Date {
    const months: { [key: string]: number } = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    const monthIndex = months[monthName.toLowerCase()];
    const date = new Date(year, monthIndex, day);

    // If the date is in the past, assume it's for next year
    if (date < new Date()) {
      date.setFullYear(year + 1);
    }

    return date;
  }
}
