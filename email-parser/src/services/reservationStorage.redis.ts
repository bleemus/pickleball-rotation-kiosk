import { Reservation, ReservationQuery } from "../types/reservation.js";
import redisClient from "./redis.js";
import { logger, errorDetails } from "./logger.js";

const RESERVATION_KEY_PREFIX = "reservation:";
const RESERVATION_INDEX_KEY = "reservation:index";
const RESERVATION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Redis-based storage service for reservations
 * Persists reservations in Redis with automatic TTL expiration
 */
export class ReservationStorage {
  constructor() {
    // Clean up old reservations every hour
    setInterval(() => this.cleanupOldReservations(), 60 * 60 * 1000);
  }

  /**
   * Add a new reservation
   */
  async addReservation(reservation: Reservation): Promise<void> {
    // Check if this reservation already exists (based on date, time, and players)
    const existing = await this.findDuplicate(reservation);
    if (existing) {
      logger.debug("Duplicate reservation found, skipping", { reservationId: reservation.id });
      return;
    }

    const key = RESERVATION_KEY_PREFIX + reservation.id;

    // Store reservation in Redis with TTL
    await redisClient.set(key, JSON.stringify(reservation), {
      EX: RESERVATION_TTL,
    });

    // Add to index
    await redisClient.sAdd(RESERVATION_INDEX_KEY, reservation.id);

    logger.info("Reservation added", {
      reservationId: reservation.id,
      date: reservation.date,
      startTime: reservation.startTime,
    });
  }

  /**
   * Get all reservations
   */
  async getAllReservations(): Promise<Reservation[]> {
    const ids = await redisClient.sMembers(RESERVATION_INDEX_KEY);
    const reservations: Reservation[] = [];

    for (const id of ids) {
      const reservation = await this.getReservation(id);
      if (reservation) {
        reservations.push(reservation);
      } else {
        // Remove from index if reservation no longer exists (expired)
        await redisClient.sRem(RESERVATION_INDEX_KEY, id);
      }
    }

    return reservations;
  }

  /**
   * Query reservations by date and time
   */
  async queryReservations(query: ReservationQuery): Promise<Reservation[]> {
    let results = await this.getAllReservations();

    if (query.date) {
      const queryDate = new Date(query.date);
      results = results.filter((r) => this.isSameDay(new Date(r.date), queryDate));
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
  async getTodayReservations(): Promise<Reservation[]> {
    const today = new Date();
    return this.queryReservations({ date: today.toISOString().split("T")[0] });
  }

  /**
   * Get reservation by ID
   */
  async getReservation(id: string): Promise<Reservation | undefined> {
    const key = RESERVATION_KEY_PREFIX + id;
    const data = await redisClient.get(key);

    if (!data) {
      return undefined;
    }

    try {
      return JSON.parse(data) as Reservation;
    } catch (error) {
      logger.error("Failed to parse reservation, removing corrupted data", {
        reservationId: id,
        ...errorDetails(error),
      });
      await redisClient.del(key);
      await redisClient.sRem(RESERVATION_INDEX_KEY, id);
      return undefined;
    }
  }

  /**
   * Delete a reservation
   */
  async deleteReservation(id: string): Promise<boolean> {
    const key = RESERVATION_KEY_PREFIX + id;
    const deleted = await redisClient.del(key);

    if (deleted > 0) {
      await redisClient.sRem(RESERVATION_INDEX_KEY, id);
      return true;
    }

    return false;
  }

  /**
   * Clean up reservations from past dates
   */
  private async cleanupOldReservations(): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const reservations = await this.getAllReservations();
    let cleaned = 0;

    for (const reservation of reservations) {
      const resDate = new Date(reservation.date);
      resDate.setHours(0, 0, 0, 0);

      if (resDate < now) {
        await this.deleteReservation(reservation.id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info("Cleaned up old reservations", { count: cleaned });
    }
  }

  /**
   * Check if a reservation is a duplicate
   */
  private async findDuplicate(reservation: Reservation): Promise<Reservation | undefined> {
    const reservations = await this.getAllReservations();

    for (const existing of reservations) {
      if (
        this.isSameDay(new Date(existing.date), new Date(reservation.date)) &&
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
}
