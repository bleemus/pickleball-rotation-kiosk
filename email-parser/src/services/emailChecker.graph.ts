import { Client, type AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { EmailParser } from "./emailParser.js";
import { Reservation } from "../types/reservation.js";
import sanitizeHtml from "sanitize-html";

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

const timestamp = () => new Date().toISOString();

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
  private parser: EmailParser;
  private onReservationFound: (reservation: Reservation) => Promise<void>;
  private userId: string;

  constructor(
    config: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      userId: string; // Email address of the account to monitor
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

    this.parser = new EmailParser();
    this.onReservationFound = onReservationFound;
    this.userId = config.userId;
  }

  /**
   * Check for new reservation emails using Microsoft Graph API
   */
  async checkEmails(): Promise<void> {
    console.log(`[${timestamp()}] Checking for new reservation emails via Microsoft Graph...`);

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
      console.log(`[${timestamp()}] Total unread emails: ${messageList.length}`);

      if (messageList.length === 0) {
        console.log(`[${timestamp()}] No new emails to process`);
        return;
      }

      // Process each message
      for (const message of messageList) {
        try {
          const subject = message.subject || "";
          const from = message.from?.emailAddress?.address || "unknown";
          const fromName = message.from?.emailAddress?.name || "";
          const fromDisplay = fromName ? `${fromName} <${from}>` : from;

          console.log(`[${timestamp()}] Processing email from ${fromDisplay}: ${subject}`);

          // Get email body text
          const bodyContent = message.body?.content || message.bodyPreview || "";

          // Convert HTML to plain text if needed
          const text = this.htmlToText(bodyContent);

          // Parse reservation
          const reservation = this.parser.parseReservation(text, subject);

          if (reservation) {
            console.log(`[${timestamp()}] ✓ Reservation found:`, {
              date: reservation.date,
              time: `${reservation.startTime} - ${reservation.endTime}`,
              court: reservation.court,
              players: reservation.players.join(", "),
            });
            await this.onReservationFound(reservation);
          } else {
            console.log(`[${timestamp()}] No valid reservation found in email from ${fromDisplay}`);
          }

          // Mark message as read
          if (message.id) {
            await this.client.api(`/users/${this.userId}/messages/${message.id}`).patch({
              isRead: true,
            });
          }
        } catch (error) {
          console.error(`[${timestamp()}] Error processing message:`, error);
        }
      }

      console.log(`[${timestamp()}] Done processing emails`);
    } catch (error) {
      console.error(`[${timestamp()}] Microsoft Graph API error:`, error);
      throw error;
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
      .replace(/&#(\d+);/g, (match: string, dec: string) => String.fromCharCode(parseInt(dec, 10)))
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
