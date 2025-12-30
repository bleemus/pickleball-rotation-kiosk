#!/usr/bin/env npx tsx
/**
 * Test script to parse .eml files using Azure OpenAI
 *
 * Usage:
 *   npx tsx scripts/test-email-parser.ts [file.eml]
 *
 * If no file is specified, parses all .eml files in test-fixtures/
 *
 * Configuration sources (in order of priority):
 *   1. Azure Key Vault (if AZURE_KEYVAULT_URL is set)
 *   2. Environment variables:
 *      - AZURE_OPENAI_ENDPOINT
 *      - AZURE_OPENAI_API_KEY
 *      - AZURE_OPENAI_DEPLOYMENT_NAME (default: gpt-4o-mini)
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { AzureOpenAI } from "openai";
import { simpleParser, ParsedMail } from "mailparser";
import sanitizeHtml from "sanitize-html";
import "dotenv/config";
import { loadConfig } from "../src/services/keyVault.js";

// AI Parser response type
interface AIParserResponse {
  is_reservation: boolean;
  date?: string;
  start_time?: string;
  end_time?: string;
  court?: string;
  organizer?: string;
  players?: string[];
  error?: string;
}

// System prompt for AI email parsing
const SYSTEM_PROMPT = `You are a specialized email parser for pickleball court reservations.

Your task is to extract reservation details from email text. The emails may be:
- Direct reservation confirmations from booking systems (Pickle Planner, CourtReserve, etc.)
- Forwarded emails (with headers like "Begin forwarded message:")
- Various formats with or without proper line breaks

Extract the following information:
1. **date**: The reservation date (not the email sent date if forwarded). Format as YYYY-MM-DD.
2. **start_time**: Start time (e.g., "5:30pm", "8:00am")
3. **end_time**: End time (e.g., "7:00pm", "9:30am")
4. **court**: Court location (e.g., "North", "South", "North, South", "East", "West", "Center", "Court 1", etc.)
5. **organizer**: The person whose reservation it is (from "Name's Reservation" or similar)
6. **players**: List of all player names

Important parsing rules:
- For forwarded emails, look for the ACTUAL reservation date (often followed by a day like "TUESDAY") not the forwarding date
- Look for markers like "following event:", "reservation details:", "booking confirmation" for the actual content
- Player names typically appear after "Players" and before fee/payment information
- If it's not a pickleball court reservation email, set is_reservation to false

Respond with valid JSON only, no markdown formatting.`;

/**
 * Convert HTML to plain text
 */
function htmlToText(html: string): string {
  if (!html) return "";

  let text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
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

  // Clean up whitespace while preserving newlines
  text = text
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .join("\n");

  return text;
}

/**
 * Parse email using Azure OpenAI
 */
async function parseEmailWithAI(
  client: AzureOpenAI,
  deployment: string,
  emailText: string,
  emailSubject: string
): Promise<AIParserResponse> {
  const userMessage = `Parse this reservation email:

Subject: ${emailSubject}

Body:
${emailText}

Extract the reservation details and respond with JSON.`;

  const response = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const resultText = response.choices[0]?.message?.content;
  if (!resultText) {
    return { is_reservation: false, error: "Empty response from AI" };
  }

  return JSON.parse(resultText) as AIParserResponse;
}

/**
 * Parse an .eml file and extract email content
 */
async function parseEmlFile(filePath: string): Promise<ParsedMail> {
  const emlContent = readFileSync(filePath, "utf-8");
  return simpleParser(emlContent);
}

/**
 * Process a single .eml file
 */
async function processFile(
  client: AzureOpenAI,
  deployment: string,
  filePath: string
): Promise<void> {
  const fileName = basename(filePath);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📧 Processing: ${fileName}`);
  console.log("=".repeat(60));

  try {
    // Parse .eml file
    const parsed = await parseEmlFile(filePath);

    const subject = parsed.subject || "(no subject)";
    const from = parsed.from?.text || "unknown";

    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);

    // Get email body - prefer text, fall back to HTML
    let bodyText = parsed.text || "";
    if (!bodyText && parsed.html) {
      bodyText = htmlToText(parsed.html);
    }

    if (!bodyText) {
      console.log("❌ No email body found");
      return;
    }

    console.log(`\n📄 Email Body Preview (first 500 chars):`);
    console.log("-".repeat(40));
    console.log(bodyText.substring(0, 500) + (bodyText.length > 500 ? "..." : ""));
    console.log("-".repeat(40));

    // Parse with AI
    console.log("\n🤖 Parsing with Azure OpenAI...");
    const result = await parseEmailWithAI(client, deployment, bodyText, subject);

    console.log("\n📋 AI Parser Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.is_reservation) {
      console.log("\n✅ Valid reservation found:");
      console.log(`   Date: ${result.date}`);
      console.log(`   Time: ${result.start_time} - ${result.end_time}`);
      console.log(`   Court: ${result.court}`);
      console.log(`   Organizer: ${result.organizer}`);
      console.log(`   Players: ${result.players?.join(", ")}`);
    } else {
      console.log("\n⚠️ Not a reservation email");
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`\n❌ Error processing ${fileName}:`, error);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Load configuration from Key Vault or environment variables
  console.log("🔧 Loading configuration...\n");
  const config = await loadConfig();

  const endpoint = config.azureOpenaiEndpoint;
  const apiKey = config.azureOpenaiApiKey;
  const deployment = config.azureOpenaiDeployment || "gpt-4o-mini";

  if (!endpoint || !apiKey) {
    console.error("\n❌ Missing Azure OpenAI configuration:");
    console.error("   azureOpenaiEndpoint: " + (endpoint ? "✓" : "✗"));
    console.error("   azureOpenaiApiKey: " + (apiKey ? "✓" : "✗"));
    console.error("\nConfigure via Azure Key Vault or environment variables:");
    console.error("   AZURE_OPENAI_ENDPOINT - Azure OpenAI endpoint URL");
    console.error("   AZURE_OPENAI_API_KEY - Azure OpenAI API key");
    console.error(
      "   AZURE_OPENAI_DEPLOYMENT_NAME - Model deployment name (optional, default: gpt-4o-mini)"
    );
    process.exit(1);
  }

  // Initialize Azure OpenAI client
  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: "2024-02-01",
  });

  console.log("\n🔧 Azure OpenAI Configuration:");
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Deployment: ${deployment}`);

  // Get files to process
  const args = process.argv.slice(2);
  let files: string[];

  if (args.length > 0) {
    // Process specified files
    files = args;
  } else {
    // Process all .eml files in test-fixtures
    const fixturesDir = join(import.meta.dirname || __dirname, "..", "test-fixtures");
    try {
      files = readdirSync(fixturesDir)
        .filter((f) => f.endsWith(".eml"))
        .map((f) => join(fixturesDir, f));
    } catch {
      console.error(`❌ Could not read test-fixtures directory: ${fixturesDir}`);
      process.exit(1);
    }
  }

  if (files.length === 0) {
    console.error("❌ No .eml files found to process");
    process.exit(1);
  }

  console.log(`\n📁 Processing ${files.length} file(s)...`);

  // Process each file
  for (const file of files) {
    await processFile(client, deployment, file);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Done processing all files");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
