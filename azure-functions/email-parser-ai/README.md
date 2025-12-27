# Email Parser AI - Azure Function

A Python Azure Function that uses Azure OpenAI to parse Pickle Planner reservation emails.

## Overview

This function replaces/augments the regex-based email parser with AI-powered parsing. It's more robust for handling varied email formats, forwarded emails, and edge cases.

## Setup

### Prerequisites

1. Azure subscription
2. Azure OpenAI resource with a deployed model (recommended: `gpt-4o-mini`)
3. Azure Functions Core Tools (for local development)
4. Python 3.9+

### Local Development

1. Copy the example settings:

   ```bash
   cp local.settings.json.example local.settings.json
   ```

2. Update `local.settings.json` with your Azure OpenAI credentials:
   - `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
   - `AZURE_OPENAI_API_KEY`: Your API key
   - `AZURE_OPENAI_DEPLOYMENT_NAME`: Your model deployment name (default: `gpt-4o-mini`)

3. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Run the function locally:
   ```bash
   func start
   ```

### Deploy to Azure

1. Create a Function App in Azure Portal (Python 3.9+, Consumption plan recommended)

2. Configure application settings:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`

3. Deploy:
   ```bash
   func azure functionapp publish <your-function-app-name>
   ```

## API

### POST /api/parse-email

Parse a reservation email.

**Request:**

```json
{
  "email_text": "Rally Club Reservation\n\nDecember 23\n5:30 - 7:00pm\n...",
  "email_subject": "Rally Club Reservation - December 23"
}
```

**Response:**

```json
{
  "is_reservation": true,
  "date": "2025-12-23",
  "start_time": "5:30pm",
  "end_time": "7:00pm",
  "court": "North",
  "organizer": "John Smith",
  "players": ["John Smith", "Jane Doe", "Bob Wilson", "Alice Brown"]
}
```

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "openai_configured": true
}
```

## Integration with Email Parser Service

To use this AI function instead of (or alongside) the regex parser, update the email-parser service to call this function:

```typescript
// In emailChecker.graph.ts
const aiResponse = await fetch("https://your-function.azurewebsites.net/api/parse-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-functions-key": process.env.AI_PARSER_FUNCTION_KEY,
  },
  body: JSON.stringify({
    email_text: text,
    email_subject: subject,
  }),
});
```

## Cost Considerations

- `gpt-4o-mini` is recommended for cost efficiency (~$0.00015 per email)
- The function includes a quick check to skip non-reservation emails before calling OpenAI
- Consider caching parsed results if processing the same emails multiple times

## Testing

Test locally with curl:

```bash
curl -X POST http://localhost:7071/api/parse-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_text": "Rally Club Reservation\n\nDecember 23\n5:30 - 7:00pm\nNorth\n\nJohn Smith'\''s Reservation\n\nPlayers\nJohn Smith\nJane Doe\n\nReservation Fee: $40.00",
    "email_subject": "Rally Club Reservation"
  }'
```
