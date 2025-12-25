import { Reservation, ReservationQuery } from "../types/reservation";
import * as fs from "fs";
import * as path from "path";

/**
 * Storage service for reservations
 * Uses a simple JSON file for persistence
 */
export class ReservationStorage {
  private reservations: Map<string, Reservation> = new Map();
  private storagePath: string;

  constructor(storagePath: string = "./data/reservations.json") {
    this.storagePath = storagePath;
    this.loadFromDisk();

    // Clean up old reservations every hour
    setInterval(() => this.cleanupOldReservations(), 60 * 60 * 1000);
  }

  /**
   * Add a new reservation
   */
  addReservation(reservation: Reservation): void {
    // Check if this reservation already exists (based on date, time, and players)
    const existing = this.findDuplicate(reservation);
    if (existing) {
      console.log("Duplicate reservation found, skipping:", reservation.id);
      return;
    }

    this.reservations.set(reservation.id, reservation);
    this.saveToDisk();
    console.log(`Reservation ${reservation.id} added successfully`);
  }

  /**
   * Get all reservations
   */
  getAllReservations(): Reservation[] {
    return Array.from(this.reservations.values());
  }

  /**
   * Query reservations by date and time
   */
  queryReservations(query: ReservationQuery): Reservation[] {
    let results = Array.from(this.reservations.values());

    if (query.date) {
      const queryDate = new Date(query.date);
      results = results.filter((r) => this.isSameDay(r.date, queryDate));
    }

    if (query.startTime) {
      results = results.filter((r) => this.timeMatches(r.startTime, query.startTime!));
    }

    if (query.endTime) {
      results = results.filter((r) => this.timeMatches(r.endTime, query.endTime!));
    }

    return results;
  }

  /**
   * Get reservations for today
   */
  getTodayReservations(): Reservation[] {
    const today = new Date();
    return this.queryReservations({ date: today.toISOString().split("T")[0] });
  }

  /**
   * Get reservation by ID
   */
  getReservation(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }

  /**
   * Delete a reservation
   */
  deleteReservation(id: string): boolean {
    const deleted = this.reservations.delete(id);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }

  /**
   * Clean up reservations from past dates
   */
  private cleanupOldReservations(): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let cleaned = 0;
    for (const [id, reservation] of this.reservations.entries()) {
      const resDate = new Date(reservation.date);
      resDate.setHours(0, 0, 0, 0);

      if (resDate < now) {
        this.reservations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old reservation(s)`);
      this.saveToDisk();
    }
  }

  /**
   * Check if a reservation is a duplicate
   */
  private findDuplicate(reservation: Reservation): Reservation | undefined {
    for (const existing of this.reservations.values()) {
      if (
        this.isSameDay(existing.date, reservation.date) &&
        existing.startTime === reservation.startTime &&
        existing.endTime === reservation.endTime &&
        this.arraysEqual(existing.players.sort(), reservation.players.sort())
      ) {
        return existing;
      }
    }
    return undefined;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Check if two time strings match (flexible comparison)
   */
  private timeMatches(time1: string, time2: string): boolean {
    // Normalize times to compare (e.g., "5:30am" vs "05:30am")
    const normalize = (time: string) => {
      const match = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
      if (!match) return time.toLowerCase();

      let hour = parseInt(match[1]);
      const minute = match[2];
      const period = match[3].toLowerCase();

      // Convert to 24-hour format for comparison
      if (period === "pm" && hour !== 12) hour += 12;
      if (period === "am" && hour === 12) hour = 0;

      return `${hour.toString().padStart(2, "0")}:${minute}`;
    };

    return normalize(time1) === normalize(time2);
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
  }

  /**
   * Save reservations to disk
   */
  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Array.from(this.reservations.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving reservations to disk:", error);
    }
  }

  /**
   * Load reservations from disk
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, "utf-8");
        const reservations: Reservation[] = JSON.parse(data);

        for (const reservation of reservations) {
          // Convert date strings back to Date objects
          reservation.date = new Date(reservation.date);
          reservation.createdAt = new Date(reservation.createdAt);
          this.reservations.set(reservation.id, reservation);
        }

        console.log(`Loaded ${reservations.length} reservation(s) from disk`);

        // Clean up old ones immediately after loading
        this.cleanupOldReservations();
      }
    } catch (error) {
      console.error("Error loading reservations from disk:", error);
    }
  }
}
