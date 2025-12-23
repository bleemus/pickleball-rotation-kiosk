# Email Parser Service

This service automatically checks email for Pickle Planner reservation emails and makes them available to the kiosk application via REST API.

## Features

- **Microsoft Graph API Integration**: OAuth2-based email access with Application Access Policy for security
- **Automatic Email Parsing**: Extracts date, time, players, court, and organizer from Pickle Planner emails
- **Redis Storage**: Persists reservations with 7-day TTL and automatic cleanup
- **REST API**: Query reservations by date, time, or current active reservations
- **Fast Polling**: Checks for new emails every 1 minute
- **Feature Flag**: Can be disabled if email service breaks
- **Lightweight**: Optimized for Raspberry Pi deployment
- **ISO Timestamped Logs**: All operations logged with UTC timestamps for debugging

## Architecture

### Services

The email parser is one of four services in the pickleball kiosk application:

1. **Email Parser** (this service) - Port 3002
2. **Backend** (game logic) - Port 3001
3. **Frontend** (React UI) - Port 3000 (dev) / Port 80 (prod)
4. **Redis** (shared data store) - Port 6379

### Data Flow

1. Email Parser checks Microsoft Graph API every 1 minute for unread "Rally Club Reservation" emails
2. Parses reservation details using regex patterns
3. Stores in Redis with 7-day TTL
4. Frontend polls `/api/reservations/current` to show active reservations
5. Automatically cleans up past reservations every hour

### Redis Schema

**Keys:**
- `reservation:{reservationId}` → JSON-serialized Reservation object
- `reservation:index` → Set of all reservation IDs (for fast enumeration)

**TTL:** 7 days (604800 seconds)

## Configuration

### Microsoft Graph API Setup

Provides OAuth2-based authentication and Application Access Policy for mailbox-level security.

**Setup Steps:**

See [GRAPH_API_SETUP.md](GRAPH_API_SETUP.md) for complete instructions. Summary:

1. Create Azure App Registration
2. Add `Mail.ReadWrite` application permission
3. Grant admin consent
4. Create client secret
5. Set up Application Access Policy to restrict access to single mailbox
6. Configure `.env` with Graph API credentials

**Environment Variables:**

```env
# Microsoft Graph API Configuration
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_USER_ID=your-email@example.com

# Check interval in minutes
EMAIL_CHECK_INTERVAL=1

# Feature flag to enable/disable email polling
ENABLE_EMAIL_POLLING=true

# Service Configuration
PORT=3002

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### Email Forwarding

Set up email forwarding in Pickle Planner to forward reservation confirmations to your configured email address.

Users can also manually forward emails to the configured address - the frontend displays:

> **Using Pickle Planner?** Forward your reservation email to `your-email@example.com` and players will appear above within 1 minute

## API Endpoints

### Health Check

#### GET /health

Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "emailPollingEnabled": true,
  "emailEnabled": true,
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

### Reservations

#### GET /api/reservations

Get all reservations.

**Query Parameters:**
- `date` (optional): ISO date string (e.g., "2025-12-17")
- `startTime` (optional): Time string (e.g., "5:30am")
- `endTime` (optional): Time string (e.g., "7:00am")

**Response:**
```json
[
  {
    "id": "res_1734567890123_abc123def",
    "date": "2025-12-17T00:00:00.000Z",
    "startTime": "5:30pm",
    "endTime": "7:00pm",
    "players": ["Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince"],
    "court": "North",
    "organizer": "Alice Johnson",
    "createdAt": "2025-12-17T10:00:00.000Z",
    "rawEmail": "..."
  }
]
```

#### GET /api/reservations/today

Get all reservations for today (UTC).

#### GET /api/reservations/current

Get reservations matching the current time (within 30 minutes of start time or currently active).

This is used by the frontend to auto-populate the player entry screen.

#### GET /api/reservations/:id

Get a specific reservation by ID.

#### POST /api/reservations

Manually add a reservation (for testing).

**Request Body:**
```json
{
  "date": "2025-12-17",
  "startTime": "5:30pm",
  "endTime": "7:00pm",
  "players": ["Alice", "Bob", "Charlie", "Diana"],
  "court": "North",
  "organizer": "Test User"
}
```

#### DELETE /api/reservations/:id

Delete a reservation by ID.

#### POST /api/check-emails

Manually trigger an email check (normally runs automatically every 1 minute).

## Email Parsing

### Supported Format

The parser expects emails from Pickle Planner with the following structure:

```
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

Reservation Fee: $XX.XX
```

### Extraction Logic

The parser uses regex patterns to extract:

1. **Date**: Month name + day (e.g., "December 17")
2. **Time**: Start and end times with am/pm (e.g., "5:30 - 7:00pm")
3. **Court**: Location name after time (e.g., "North", "South")
4. **Organizer**: Name before "'s Reservation"
5. **Players**: Lines after "Players" header, filtered by name format validation

### HTML to Text Conversion

Emails are HTML-formatted. The parser:
1. Removes `<style>` and `<script>` tags
2. Converts `<li>` tags to newlines with bullets
3. Converts block elements (`<div>`, `<p>`, `<br>`) to newlines
4. Decodes HTML entities (`&nbsp;`, `&amp;`, etc.)
5. Preserves line structure for regex matching

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

Starts the server with hot-reload on port 3002.

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/` directory.

### Run Production

```bash
npm start
```

Runs the compiled code from `dist/`.

### Type Checking

```bash
npm run typecheck
```

Runs TypeScript type checker without building.

## Docker

The service is included in the main `docker-compose.yml` and starts automatically with the rest of the application.

### Build

```bash
# From repository root
docker-compose build email-parser
```

### Run

```bash
# Start all services
docker-compose up -d

# Start only email-parser (requires Redis)
docker-compose up -d redis email-parser
```

### View Logs

```bash
# From repository root
make email-logs

# Or directly with docker-compose
docker-compose logs -f email-parser
```

## Troubleshooting

### No reservations appearing

1. **Check email polling status:**
   ```bash
   curl http://localhost:3002/health
   ```

   Should show `"emailPollingEnabled": true` and `"emailEnabled": true`

2. **Verify emails exist:**
   - Check the configured email account for unread "Rally Club Reservation" emails
   - Emails are automatically marked as read after processing

3. **Check logs:**
   ```bash
   make email-logs
   ```

   Look for:
   - `[2025-12-22T10:30:00.000Z] Checking for new emails...`
   - `[2025-12-22T10:30:01.000Z] Found X unread messages`
   - `[2025-12-22T10:30:02.000Z] Parsed reservation for ...`

4. **Manually trigger email check:**
   ```bash
   curl -X POST http://localhost:3002/api/check-emails
   ```

5. **Check Redis:**
   ```bash
   docker exec -it pickleball-redis redis-cli SMEMBERS reservation:index
   docker exec -it pickleball-redis redis-cli GET reservation:<id>
   ```

### Graph API Access Denied

If you see `ErrorAccessDenied` errors:

1. Verify `Mail.ReadWrite` permission is added in Azure Portal
2. Ensure admin consent is granted
3. Check Application Access Policy is configured correctly
4. Wait 5-10 minutes for Azure AD changes to propagate

See [GRAPH_API_SETUP.md](GRAPH_API_SETUP.md) for detailed troubleshooting.

### Email parsing issues

If reservations are being found but not parsed correctly:

1. **Check raw email format:**
   ```bash
   curl http://localhost:3002/api/reservations | jq '.[0].rawEmail'
   ```

2. **Verify expected format:**
   - Email subject must contain "Rally Club Reservation"
   - Players section must have "Players" on its own line
   - Player names must be 2+ words, alphabetic characters only

3. **Update regex patterns:**
   - Edit `src/services/emailParser.ts` if Pickle Planner email format changes
   - Regex patterns are documented in code comments

### Service won't start

1. **Check Redis connection:**
   ```bash
   docker ps | grep redis
   ```

   Redis must be running before email-parser starts.

2. **Check port conflicts:**
   ```bash
   lsof -i :3002
   ```

   Port 3002 must be available.

3. **Check environment variables:**
   ```bash
   cat email-parser/.env
   ```

   Ensure Graph API credentials are configured.

## Testing

### Manual Test Reservation

Use the provided test script to create a reservation that appears immediately:

```bash
cd email-parser
./create-test-reservation.sh
```

This creates a reservation for "now" (30 minutes ago to 90 minutes from now) that shows as "current" on the entry screen.

### API Testing

```bash
# Health check
curl http://localhost:3002/health

# Get all reservations
curl http://localhost:3002/api/reservations

# Get current reservations (for entry screen)
curl http://localhost:3002/api/reservations/current

# Get today's reservations
curl http://localhost:3002/api/reservations/today

# Manually trigger email check
curl -X POST http://localhost:3002/api/check-emails

# Create test reservation
curl -X POST http://localhost:3002/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-12-22",
    "startTime": "5:30pm",
    "endTime": "7:00pm",
    "players": ["Alice", "Bob", "Charlie", "Diana"],
    "court": "North",
    "organizer": "Test"
  }'
```

## Project Structure

```
email-parser/
├── src/
│   ├── server.ts                          # Express server & email check scheduler
│   ├── types/
│   │   └── reservation.ts                 # TypeScript types
│   ├── services/
│   │   ├── redis.ts                       # Redis client connection
│   │   ├── reservationStorage.redis.ts    # Redis-based storage with TTL
│   │   ├── emailParser.ts                 # Email parsing logic
│   │   └── emailChecker.graph.ts          # Microsoft Graph API client
│   └── routes/
│       └── reservations.ts                # REST API endpoints
├── create-test-reservation.sh             # Test data script
├── GRAPH_API_SETUP.md                     # Azure Graph API setup guide
├── Dockerfile                             # Multi-stage build
├── package.json                           # Dependencies & scripts
├── tsconfig.json                          # TypeScript config
└── .env.example                           # Environment template
```

## Integration with Main Application

The email parser integrates with the kiosk application through:

1. **Backend Proxy**: Backend service proxies reservation requests to email-parser
2. **Frontend Polling**: Entry screen polls `/api/reservations/current` every 5 seconds
3. **Shared Redis**: Both backend and email-parser use the same Redis instance
4. **Docker Compose**: All services orchestrated together with health checks
5. **Auto-population**: When current reservation exists, player names auto-fill on entry screen

## Security Notes

**Microsoft Graph API:**
- Uses client credentials flow (daemon app)
- Application Access Policy restricts to single mailbox
- Client secret should be kept secure (never commit to git)
- Mail.ReadWrite permission required to mark emails as read

**Redis:**
- Runs on localhost only by default
- No authentication configured (add Redis password for production)
- Data automatically expires after 7 days

**Feature Flag:**
- Set `ENABLE_EMAIL_POLLING=false` to disable email polling if service breaks
- Service continues to run and serve API requests with empty data
- Can be toggled without code changes

## License

MIT - Part of the Pickleball Rotation Kiosk project
