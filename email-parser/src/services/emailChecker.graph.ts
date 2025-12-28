import { Client, type AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { Reservation } from "../types/reservation.js";
import sanitizeHtml from "sanitize-html";
import { logger, errorDetails } from "./logger.js";

// Microsoft Graph types
interface Message {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    content?: string;
    contentType?: string;
  };
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  receivedDateTime?: string;
}

// AI Parser response type
interface AIParserResponse {
  is_reservation: boolean;
  date?: string; // ISO format: YYYY-MM-DD
  start_time?: string;
  end_time?: string;
  court?: string;
  organizer?: string;
  players?: string[];
  error?: string;
}

/**
 * Custom authentication provider that uses Azure Identity ClientSecretCredential
 * This avoids ESM compatibility issues with the Graph client's built-in auth providers
 */
class AzureIdentityAuthProvider implements AuthenticationProvider {
  private credential: ClientSecretCredential;
  private scopes: string[];

  constructor(credential: ClientSecretCredential, scopes: string[]) {
    this.credential = credential;
    this.scopes = scopes;
  }

  async getAccessToken(): Promise<string> {
    const token = await this.credential.getToken(this.scopes);
    if (!token) {
      throw new Error("Failed to acquire access token");
    }
    return token.token;
  }
}

export class GraphEmailChecker {
  private client: Client;
  private onReservationFound: (reservation: Reservation) => Promise<void>;
  private userId: string;
  private aiParserUrl: string;
  private aiParserKey: string;

  constructor(
    config: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      userId: string; // Email address of the account to monitor
      aiParserUrl: string; // Azure Function URL for AI parsing
      aiParserKey: string; // Azure Function key
    },
    onReservationFound: (reservation: Reservation) => Promise<void>
  ) {
    // Create credential using client secret
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    // Create custom authentication provider
    const authProvider = new AzureIdentityAuthProvider(credential, [
      "https://graph.microsoft.com/.default",
    ]);

    // Initialize Graph client
    this.client = Client.initWithMiddleware({
      authProvider,
    });

    this.onReservationFound = onReservationFound;
    this.userId = config.userId;
    this.aiParserUrl = config.aiParserUrl;
    this.aiParserKey = config.aiParserKey;
  }

  /**
   * Parse email using Azure Function AI parser
   */
  private async parseEmailWithAI(
    emailText: string,
    emailSubject: string
  ): Promise<Reservation | null> {
    try {
      const response = await fetch(this.aiParserUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-functions-key": this.aiParserKey,
        },
        body: JSON.stringify({
          email_text: emailText,
          email_subject: emailSubject,
        }),
      });

      if (!response.ok) {
        logger.error("AI parser returned error status", { status: response.status });
        return null;
      }

      const result = (await response.json()) as AIParserResponse;

      if (!result.is_reservation) {
        return null;
      }

      // Convert AI response to Reservation object
      if (!result.date || !result.start_time || !result.players || result.players.length === 0) {
        logger.warn("AI parser returned incomplete reservation data");
        return null;
      }

      const reservation: Reservation = {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        date: new Date(result.date),
        startTime: result.start_time,
        endTime: result.end_time || result.start_time,
        court: result.court || "Unknown",
        organizer: result.organizer || result.players[0],
        players: result.players,
        createdAt: new Date(),
        rawEmail: emailText,
      };

      return reservation;
    } catch (error) {
      logger.error("Error calling AI parser", errorDetails(error));
      return null;
    }
  }

  /**
   * Check for new reservation emails using Microsoft Graph API
   */
  async checkEmails(): Promise<void> {
    logger.info("Checking for new reservation emails via Microsoft Graph");

    try {
      // Get unread messages from inbox
      const messages = await this.client
        .api(`/users/${this.userId}/mailFolders/inbox/messages`)
        .filter("isRead eq false")
        .select("id,subject,bodyPreview,body,from,receivedDateTime")
        .top(50) // Limit to 50 most recent unread messages
        .orderby("receivedDateTime desc")
        .get();

      const messageList = messages.value as Message[];
      logger.info("Unread emails found", { count: messageList.length });

      if (messageList.length === 0) {
        logger.debug("No new emails to process");
        return;
      }

      // Process each message
      for (const message of messageList) {
        try {
          const subject = message.subject || "";
          const from = message.from?.emailAddress?.address || "unknown";
          const fromName = message.from?.emailAddress?.name || "";
          const fromDisplay = fromName ? `${fromName} <${from}>` : from;

          logger.info("Processing email", { from: fromDisplay, subject });

          // Get email body text
          const bodyContent = message.body?.content || message.bodyPreview || "";

          // Convert HTML to plain text if needed
          const text = this.htmlToText(bodyContent);

          // Parse reservation using AI
          const reservation = await this.parseEmailWithAI(text, subject);

          if (reservation) {
            logger.info("Reservation found", {
              date: reservation.date,
              time: `${reservation.startTime} - ${reservation.endTime}`,
              court: reservation.court,
              playerCount: reservation.players.length,
            });
            await this.onReservationFound(reservation);
          } else {
            logger.debug("No valid reservation found in email", { from: fromDisplay });
          }

          // Mark message as read with retry to prevent duplicate processing
          if (message.id) {
            await this.markMessageAsReadWithRetry(message.id);
          }
        } catch (error) {
          logger.error("Error processing message", errorDetails(error));
          // Still attempt to mark as read to prevent reprocessing on error
          if (message.id) {
            try {
              await this.markMessageAsReadWithRetry(message.id);
            } catch (markError) {
              logger.error("Failed to mark failed message as read", errorDetails(markError));
            }
          }
        }
      }

      logger.info("Done processing emails");
    } catch (error) {
      logger.error("Microsoft Graph API error", errorDetails(error));
      throw error;
    }
  }

  /**
   * Mark a message as read with retry logic to prevent duplicate processing
   */
  private async markMessageAsReadWithRetry(messageId: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.api(`/users/${this.userId}/messages/${messageId}`).patch({
          isRead: true,
        });
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        logger.warn("Failed to mark message as read, retrying", { attempt, maxRetries });
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Improved HTML to text converter
   * Preserves line breaks and structure needed for email parsing
   */
  private htmlToText(html: string): string {
    if (!html) return "";

    // First, use a well-tested sanitizer to remove all HTML tags, including
    // script/style blocks and their contents. This avoids incomplete
    // multi-character sanitization issues from custom regexes.
    let text = sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {},
      // Ensure script/style and other potentially dangerous content are removed.
      disallowedTagsMode: "discard",
    });

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_match: string, dec: string) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&amp;/g, "&");

    // Clean up whitespace while preserving newlines where present
    text = text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join("\n");

    return text;
  }
}
