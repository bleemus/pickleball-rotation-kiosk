import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { EmailParser } from "./emailParser";
import { Reservation } from "../types/reservation";

const timestamp = () => new Date().toISOString();

export class EmailChecker {
  private config: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  };
  private parser: EmailParser;
  private onReservationFound: (reservation: Reservation) => void;

  constructor(
    config: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
    },
    onReservationFound: (reservation: Reservation) => void
  ) {
    this.config = config;
    this.parser = new EmailParser();
    this.onReservationFound = onReservationFound;
  }

  /**
   * Check for new reservation emails
   */
  async checkEmails(): Promise<void> {
    console.log(`[${timestamp()}] Checking for new reservation emails...`);
    
    // Create a new ImapFlow client for each check to avoid reuse issues
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      logger: false,
    });

    try {
      await client.connect();

      // Open inbox
      await client.mailboxOpen("INBOX");

      // First, check all unread emails to see what we have
      const allUnreadResult = await client.search({ seen: false });
      const allUnread = Array.isArray(allUnreadResult) ? allUnreadResult : [];
      console.log(`[${timestamp()}] Total unread emails: ${allUnread.length}`);

      // Search for unread emails from Pickle Planner
      const messagesResult = await client.search({
        seen: false,
        from: "pickleplanner.com",
      });
      const messages = Array.isArray(messagesResult) ? messagesResult : [];

      console.log(`[${timestamp()}] Unread emails from pickleplanner.com: ${messages.length}`);

      if (messages.length === 0) {
        // If no direct emails from pickleplanner.com, check all unread emails
        // (they might be forwarded)
        if (allUnread.length > 0) {
          console.log(`[${timestamp()}] No emails from pickleplanner.com, but found ${allUnread.length} unread email(s). Checking all...`);
          // Process all unread emails instead
          const messagesToProcess = allUnread;

          console.log(`[${timestamp()}] Found ${messagesToProcess.length} new email(s) to process`);

          // Process each message
          for (const uid of messagesToProcess) {
            try {
              // Fetch the email
              const message = await client.fetchOne(String(uid), {
                source: true,
                envelope: true,
              });

              if (!message || !message.source) {
                console.error(`[${timestamp()}] Message ${uid} has no source`);
                continue;
              }

              // Parse email
              const parsed = await simpleParser(message.source);
              const subject = parsed.subject || "";
              const text = parsed.text || "";
              const fromAddress = parsed.from?.value?.[0]?.address || "unknown";
              const fromName = parsed.from?.value?.[0]?.name || "";
              const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

              console.log(`[${timestamp()}] Processing email from ${from}: ${subject}`);

              // Parse reservation
              const reservation = this.parser.parseReservation(text, subject);
              if (reservation) {
                console.log(`[${timestamp()}] ✓ Reservation found:`, {
                  date: reservation.date,
                  time: `${reservation.startTime} - ${reservation.endTime}`,
                  court: reservation.court,
                  players: reservation.players.join(", ")
                });
                this.onReservationFound(reservation);
              } else {
                console.log(`[${timestamp()}] No valid reservation found in email from ${from}`);
              }

              // Mark as read
              await client.messageFlagsAdd(String(uid), ["\\Seen"]);
            } catch (error) {
              console.error(`[${timestamp()}] Error processing message ${uid}:`, error);
            }
          }

          console.log(`[${timestamp()}] Done fetching emails`);
          await client.logout();
          return;
        }

        console.log(`[${timestamp()}] No new reservation emails found`);
        await client.logout();
        return;
      }

      console.log(`[${timestamp()}] Found ${messages.length} new email(s)`);

      // Process each message
      for (const uid of messages) {
        try {
          // Fetch the email
          const message = await client.fetchOne(String(uid), {
            source: true,
          });

          if (!message || !message.source) {
            console.error(`[${timestamp()}] Message ${uid} has no source`);
            continue;
          }

          // Parse email
          const parsed = await simpleParser(message.source);
          const subject = parsed.subject || "";
          const text = parsed.text || "";

          console.log(`[${timestamp()}] Processing email: ${subject}`);

          // Parse reservation
          const reservation = this.parser.parseReservation(text, subject);
          if (reservation) {
            console.log(`[${timestamp()}] ✓ Reservation found:`, {
              date: reservation.date,
              time: `${reservation.startTime} - ${reservation.endTime}`,
              court: reservation.court,
              players: reservation.players.join(", ")
            });
            this.onReservationFound(reservation);
          } else {
            console.log(`[${timestamp()}] No valid reservation found in email`);
          }

          // Mark as read
          await client.messageFlagsAdd(String(uid), ["\\Seen"]);
        } catch (error) {
          console.error(`[${timestamp()}] Error processing message ${uid}:`, error);
        }
      }

      console.log(`[${timestamp()}] Done fetching emails`);
      await client.logout();
    } catch (error) {
      console.error(`[${timestamp()}] IMAP connection error:`, error);
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
      throw error;
    }
  }
}
