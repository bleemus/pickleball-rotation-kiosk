import { Reservation } from "../types/reservation.js";

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

      // Extract date (e.g., "December 17" or "December 23TUESDAY")
      // Look for date pattern followed by day of week (MONDAY, TUESDAY, etc.) to find the reservation date
      // This helps distinguish from forwarded email header dates
      const dateWithDayMatch = emailText.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)/i
      );
      if (dateWithDayMatch) {
        const month = dateWithDayMatch[1];
        const day = parseInt(dateWithDayMatch[2]);
        const year = new Date().getFullYear();
        reservation.date = this.parseDate(month, day, year);
      } else {
        // Fallback: look for date pattern after "following event:" which indicates actual reservation
        const afterEventMatch = emailText.match(
          /following event:[\s\S]*?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
        );
        if (afterEventMatch) {
          const month = afterEventMatch[1];
          const day = parseInt(afterEventMatch[2]);
          const year = new Date().getFullYear();
          reservation.date = this.parseDate(month, day, year);
        } else {
          // Last fallback: first date match (original behavior)
          const dateMatch = emailText.match(
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
          );
          if (dateMatch) {
            const month = dateMatch[1];
            const day = parseInt(dateMatch[2]);
            const year = new Date().getFullYear();
            reservation.date = this.parseDate(month, day, year);
          }
        }
      }

      // Extract time (e.g., "5:30 - 7:00am")
      const timeMatch = emailText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(am|pm)/i);
      if (timeMatch) {
        reservation.startTime = timeMatch[1] + timeMatch[3].toLowerCase();
        reservation.endTime = timeMatch[2] + timeMatch[3].toLowerCase();
      }

      // Extract court location (e.g., "North", "South", "North, South")
      // Try multiple patterns:
      // 1. Time followed by newline then court: "7:00pm\nNorth"
      // 2. Time followed by newline then courts: "3:30pm\nNorth, South"
      // 3. Time on same line as court: "3:30pmNorth, South" (no space/newline)
      // Courts are typically: North, South, East, West, Center (and combinations)
      const courtPatterns = [
        /\d{1,2}:\d{2}(am|pm)\s*\n\s*((?:North|South|East|West|Center)(?:,\s*(?:North|South|East|West|Center))*)/i, // time\ncourt(s) with newline
        /\d{1,2}:\d{2}(am|pm)\s*((?:North|South|East|West|Center)(?:,\s*(?:North|South|East|West|Center))*)/i, // time + court(s) no newline
      ];
      for (const pattern of courtPatterns) {
        const courtMatch = emailText.match(pattern);
        if (courtMatch) {
          reservation.court = courtMatch[2].trim();
          break;
        }
      }

      // Extract organizer (e.g., "Joseph Arcilla's Reservation", "Mary-Jane O'Brien's Reservation")
      // Look for pattern: "Name's Reservation"
      // Name can include hyphens, apostrophes, and spaces
      // Pattern: Start with capital, then letters/hyphens, followed by one or more additional name parts
      const organizerMatch = emailText.match(
        /([A-Z][a-zA-Z'-]+(?:[\s]+[A-Z]?[a-zA-Z'-]+)+)'s Reservation/
      );
      if (organizerMatch) {
        // Filter out court names and day names that might have been captured
        let name = organizerMatch[1].trim();
        const prefixesToRemove = [
          "North",
          "South",
          "East",
          "West",
          "Center",
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        // Remove any prefixes
        for (const prefix of prefixesToRemove) {
          if (name.startsWith(prefix)) {
            name = name.substring(prefix.length).trim();
          }
        }
        if (name && name.split(/\s+/).length >= 2) {
          reservation.organizer = name;
        }
      }

      // Extract players
      // Look for "Players" followed by player names
      // Handle both newline-separated and concatenated formats
      const playersSection = emailText.match(
        /Players\s*[\n]?([\s\S]*?)(?=Reservation Fee|Fee Breakdown|Total:|Status:|The door code)/i
      );
      if (playersSection) {
        const playerNames: string[] = [];
        const playerText = playersSection[1];

        // Try splitting by newlines first
        let lines = playerText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        // If we only got one "line" (text is concatenated), try splitting by known patterns
        // Player names are typically "FirstName LastName" format
        if (lines.length <= 1 && playerText.length > 20) {
          // Split on capital letter that starts a new name (FirstnameLastname pattern)
          // Match: capital letter followed by lowercase, then eventually another capital
          const nameMatches = playerText.match(/[A-Z][a-z]+\s+[A-Z][a-z'-]+/g);
          if (nameMatches) {
            lines = nameMatches;
          }
        }

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
    return `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
