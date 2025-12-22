export interface Reservation {
  id: string;
  date: string; // ISO date string
  startTime: string; // e.g., "5:30am"
  endTime: string;   // e.g., "7:00am"
  players: string[];
  court?: string;
  organizer?: string;
  rawEmail?: string;
  createdAt: string; // ISO date string
}
