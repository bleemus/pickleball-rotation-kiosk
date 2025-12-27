import { describe, it, expect } from "vitest";
import { EmailParser } from "./emailParser.js";

describe("EmailParser", () => {
  const parser = new EmailParser();

  describe("parseReservation", () => {
    it("should parse a valid Pickle Planner reservation email", () => {
      const emailText = `
Rally Club Reservation

December 17
5:30 - 7:00pm
North

Joseph Arcilla's Reservation

Players
• Alice Johnson
• Bob Smith
• Charlie Brown
• Diana Prince

Reservation Fee: $40.00
Fee Breakdown
Total: $40.00
Status: Confirmed
`;

      const emailSubject = "Rally Club Reservation - December 17";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      expect(result?.date).toBeInstanceOf(Date);
      expect(result?.startTime).toBe("5:30pm");
      expect(result?.endTime).toBe("7:00pm");
      expect(result?.court).toBe("North");
      expect(result?.organizer).toBe("Joseph Arcilla");
      expect(result?.players).toEqual([
        "Alice Johnson",
        "Bob Smith",
        "Charlie Brown",
        "Diana Prince",
      ]);
    });

    it("should parse a reservation with AM times", () => {
      const emailText = `
Rally Club Reservation

January 5
8:00 - 9:30am
South

John Doe's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      expect(result?.startTime).toBe("8:00am");
      expect(result?.endTime).toBe("9:30am");
    });

    it("should handle players without bullet points", () => {
      const emailText = `
Rally Club Reservation

February 20
6:00 - 7:30pm
North

Mary Smith's Reservation

Players
John Anderson
Jane Wilson
Mike Johnson
Sarah Davis

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      expect(result?.players).toEqual([
        "John Anderson",
        "Jane Wilson",
        "Mike Johnson",
        "Sarah Davis",
      ]);
    });

    it("should reject emails without Rally Club Reservation in subject or body", () => {
      const emailText = `
Some random email

December 17
5:30 - 7:00pm
`;

      const emailSubject = "Random Subject";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeNull();
    });

    it("should reject emails without date", () => {
      const emailText = `
Rally Club Reservation

5:30 - 7:00pm
North

John Doe's Reservation

Players
• Player One
• Player Two
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeNull();
    });

    it("should reject emails without start time", () => {
      const emailText = `
Rally Club Reservation

December 17
North

John Doe's Reservation

Players
• Player One
• Player Two
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeNull();
    });

    it("should reject emails without players", () => {
      const emailText = `
Rally Club Reservation

December 17
5:30 - 7:00pm
North

John Doe's Reservation

Players

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeNull();
    });

    it("should filter out invalid player names", () => {
      const emailText = `
Rally Club Reservation

March 10
5:30 - 7:00pm
North

Test Organizer's Reservation

Players
• Valid Player
• Another Valid Player
• 123Invalid
• X
• Too Many Words In This Name To Be Valid Player Name
• Good Name

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      expect(result?.players).toEqual(["Valid Player", "Another Valid Player", "Good Name"]);
    });

    it("should handle hyphenated and apostrophe names", () => {
      const emailText = `
Rally Club Reservation

April 15
5:30 - 7:00pm
North

Mary-Jane O'Brien's Reservation

Players
• Jean-Luc Picard
• Miles O'Brien
• Anne-Marie Smith
• Patrick O'Neil

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      expect(result?.players).toEqual([
        "Jean-Luc Picard",
        "Miles O'Brien",
        "Anne-Marie Smith",
        "Patrick O'Neil",
      ]);
      expect(result?.organizer).toBe("Mary-Jane O'Brien");
    });

    it("should handle date in the past by assuming next year", () => {
      const emailText = `
Rally Club Reservation

January 1
5:30 - 7:00pm
North

Test User's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

      const emailSubject = "Rally Club Reservation";

      const result = parser.parseReservation(emailText, emailSubject);

      expect(result).toBeDefined();
      if (result?.date) {
        const today = new Date();
        // If January 1 is in the past, it should be next year
        if (result.date < today) {
          expect(result.date.getFullYear()).toBe(today.getFullYear() + 1);
        }
      }
    });

    it("should extract court location", () => {
      const testCourts = ["North", "South", "East", "West", "Center"];

      testCourts.forEach((court) => {
        const emailText = `
Rally Club Reservation

May 20
5:30 - 7:00pm
${court}

Test User's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

        const result = parser.parseReservation(emailText, "Rally Club Reservation");

        expect(result).toBeDefined();
        expect(result?.court).toBe(court);
      });
    });

    it("should handle different month names", () => {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      months.forEach((month, index) => {
        const emailText = `
Rally Club Reservation

${month} 15
5:30 - 7:00pm
North

Test User's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

        const result = parser.parseReservation(emailText, "Rally Club Reservation");

        expect(result).toBeDefined();
        expect(result?.date?.getMonth()).toBe(index);
      });
    });

    it("should generate unique IDs", () => {
      const emailText = `
Rally Club Reservation

June 10
5:30 - 7:00pm
North

Test User's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

      const result1 = parser.parseReservation(emailText, "Rally Club Reservation");
      const result2 = parser.parseReservation(emailText, "Rally Club Reservation");

      expect(result1?.id).toBeDefined();
      expect(result2?.id).toBeDefined();
      expect(result1?.id).not.toBe(result2?.id);
    });

    it("should include createdAt timestamp", () => {
      const emailText = `
Rally Club Reservation

July 25
5:30 - 7:00pm
North

Test User's Reservation

Players
• Player One
• Player Two
• Player Three
• Player Four

Reservation Fee: $40.00
`;

      const before = new Date();
      const result = parser.parseReservation(emailText, "Rally Club Reservation");
      const after = new Date();

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.createdAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result?.createdAt?.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should store raw email text", () => {
      const emailText = `Rally Club Reservation

August 30
5:30 - 7:00pm
North

Test User's Reservation

Players
• Player One
• Player Two

Reservation Fee: $40.00`;

      const result = parser.parseReservation(emailText, "Rally Club Reservation");

      expect(result?.rawEmail).toBe(emailText);
    });

    it("should parse forwarded email with day of week (e.g., December 23TUESDAY)", () => {
      const emailText = `Begin forwarded message:From: Pickle Planner <automated_at_pickleplanner.com>Subject: Rally Club ReservationDate: December 14, 2025 at 7:43:48 PM CSTTo: user@example.comHi Michael,You have the following event:December 23TUESDAYMacy Russell's Reservation1:30 - 3:30pmNorth, SouthPlayersMacy RussellMichael HellrichAnn JacksonTom PaoliDave RomoserShelly RomoserKevin JaklevicReggie ResperReservation FeeTotal: $31.20Status: PaidFee Breakdown:Dave Romoser    $0.00Macy Russell    $0.00Michael Hellrich    $0.00The door code is 6407`;

      const result = parser.parseReservation(emailText, "Rally Club Reservation");

      expect(result).toBeDefined();
      // Should extract December 23 (from reservation) not December 14 (from forwarded header)
      expect(result?.date?.getDate()).toBe(23);
      expect(result?.date?.getMonth()).toBe(11); // December is month 11
      expect(result?.startTime).toBe("1:30pm");
      expect(result?.endTime).toBe("3:30pm");
      expect(result?.court).toBe("North, South");
      expect(result?.organizer).toBe("Macy Russell");
      expect(result?.players).toContain("Macy Russell");
      expect(result?.players).toContain("Michael Hellrich");
      expect(result?.players?.length).toBeGreaterThanOrEqual(4);
    });

    it("should parse multi-court reservations (North, South)", () => {
      const emailText = `
Rally Club Reservation

December 15
1:00 - 3:00pm
North, South

Team Event's Reservation

Players
Alice Johnson
Bob Smith
Charlie Brown
Diana Prince
Eve Williams
Frank Miller

Reservation Fee: $60.00
`;

      const result = parser.parseReservation(emailText, "Rally Club Reservation");

      expect(result).toBeDefined();
      expect(result?.court).toBe("North, South");
      expect(result?.players?.length).toBe(6);
    });

    it("should handle 'following event:' pattern to find reservation date", () => {
      const emailText = `From: Pickle Planner
Subject: Rally Club Reservation
Date: November 1, 2025

Hi User,
You have the following event:December 10
5:00 - 6:30pm
North

John Doe's Reservation

Players
Player One
Player Two
Player Three
Player Four

Reservation Fee: $40.00`;

      const result = parser.parseReservation(emailText, "Rally Club Reservation");

      expect(result).toBeDefined();
      // Should extract December 10 (after "following event:") not November 1 (from header)
      expect(result?.date?.getDate()).toBe(10);
      expect(result?.date?.getMonth()).toBe(11); // December
    });
  });
});
