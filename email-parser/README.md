# Email Parser Service

This service automatically checks a configured email account for Pickle Planner reservation emails and makes them available to the kiosk application.

## Features

- Automatically polls email inbox for new Pickle Planner reservation emails
- Parses reservation details (date, time, players, court)
- Stores reservations until the date passes
- Exposes REST API for querying reservations
- Lightweight and Raspberry Pi 5 compatible

## Configuration

### Email Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Configure your email settings in `.env`:
   ```env
   EMAIL_USER=your-email@example.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_HOST=imap.gmail.com
   EMAIL_PORT=993
   EMAIL_TLS=true
   EMAIL_CHECK_INTERVAL=5
   PORT=3002
   ```

### Gmail Setup

If using Gmail, you'll need to:

1. Enable IMAP in Gmail settings:
   - Go to Gmail → Settings → Forwarding and POP/IMAP
   - Enable IMAP
2. Create an **App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: Mail
   - Select device: Other (Custom name) → "Pickleball Kiosk"
   - Click Generate
   - Copy the 16-character password
   - Use this password in `EMAIL_PASSWORD` (not your regular Gmail password)

### Email Forwarding

Set up email forwarding in Pickle Planner to forward reservation confirmations to your configured email address.

## API Endpoints

### GET /health

Health check endpoint.

### GET /api/reservations

Get all reservations.

Query parameters:

- `date`: ISO date string (e.g., "2025-12-17")
- `startTime`: Time string (e.g., "5:30am")
- `endTime`: Time string (e.g., "7:00am")

### GET /api/reservations/today

Get all reservations for today.

### GET /api/reservations/current

Get reservations matching the current time (within 30 minutes of start or currently active).

### GET /api/reservations/:id

Get a specific reservation by ID.

### POST /api/reservations

Manually add a reservation (for testing).

### DELETE /api/reservations/:id

Delete a reservation.

### POST /api/check-emails

Manually trigger an email check.

## How It Works

1. **Email Polling**: Every N minutes (configured via `EMAIL_CHECK_INTERVAL`), the service checks for unread emails from `pickleplanner.com`
2. **Email Parsing**: Uses regex patterns to extract:
   - Reservation date
   - Start and end times
   - Player names
   - Court location
   - Organizer name
3. **Storage**: Reservations are stored in a JSON file (`data/reservations.json`) with persistence across restarts
4. **Cleanup**: Old reservations (past dates) are automatically deleted every hour
5. **API**: The backend service proxies requests to this service, and the frontend polls for current reservations

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run Production

```bash
npm start
```

## Docker

The service is included in the main `docker-compose.yml` and will start automatically with the rest of the application.

To rebuild just this service:

```bash
docker-compose build email-parser
```

## Troubleshooting

### No reservations appearing

1. Check email credentials are correct
2. Verify IMAP is enabled in your email provider
3. Check logs: `docker-compose logs email-parser`
4. Manually trigger email check: `curl -X POST http://localhost:3002/api/check-emails`

### Email parsing issues

The parser expects emails in the Pickle Planner format. If the email format changes, you may need to update the regex patterns in `src/services/emailParser.ts`.

### Service health check

```bash
curl http://localhost:3002/health
```

Should return:

```json
{
  "status": "ok",
  "emailEnabled": true,
  "timestamp": "2025-12-17T..."
}
```
