# Changelog

## Recent Updates

### December 21, 2025 - Test Suite & Type Safety Improvements

#### Unit Test Fixes (171 tests now passing)
- **Component Tests**: Fixed all Vitest unit tests across 9 test suites
  - Updated button text expectations ("📊" → "View History")
  - Fixed duplicate element selectors (Player Stats appears on mobile & desktop)
  - Added missing mock data imports (mockSessionWithRound, mockGameHistory, mockEndedSession)
  - Fixed gameHistory structure to match GameHistory interface
  - Updated SessionSummary text ("Game Complete!" → "Session Complete!")
  - Added 8-player requirement for multi-court test scenarios
  - Improved player removal test with better DOM queries
  - Fixed PlayerManager component text expectations

#### E2E Test Fixes (16 Playwright tests passing)
- **E2E Tests**: Fixed all 16 Playwright end-to-end tests to pass successfully
  - Fixed localStorage key references (`sessionId` → `pickleballSessionId`)
  - Updated responsive design selectors to handle mobile/desktop duplicate elements
  - Fixed score persistence test expectations (app shows PlayerManager after completing round)
  - Added dialog handlers for reset confirmation prompts
  - Improved timeout handling and wait conditions

#### Type Safety
- **TypeScript**: Fixed TypeScript compilation errors across frontend test suite
  - Removed unused imports (`mockMatch2`, `waitFor`)
  - Fixed `global` references to use `window` object
  - Cleaned up unused function parameters in mock handlers

#### Test Coverage
All tests now passing:
- **Unit Tests**: 171 Vitest tests across 9 test files
  - Component tests (CurrentMatchups, PlayerSetup, ScoreEntry, BenchDisplay, PlayerStats, SessionSummary)
  - Hook tests (useApi, useGameState)
  - Integration tests (App.test.tsx - 18 tests)
- **E2E Tests**: 16 Playwright tests
  - Setup & player management (4 tests)
  - Full game flow (1 test)
  - Score validation (4 tests)  
  - Session recovery & persistence (4 tests)
  - End-to-end integration (3 tests)

### December 2024 - Raspberry Pi Improvements

#### Browser & Desktop Environment Updates
- **Firefox ESR**: Replaced Chromium with Firefox ESR for better package availability on newer Raspberry Pi OS releases
- **Wayland Support**: Added support for Labwc (Wayland) desktop environment alongside LXDE (X11)
- **Dual Desktop Configuration**: Installer now configures both Labwc and LXDE autostart for compatibility across Pi OS versions

#### Network & Display Enhancements
- **Localhost URLs**: Changed kiosk autostart to use `localhost` instead of hostname for more reliable local connections
- **IP Address Display**: Spectator screen now always displays IP address instead of hostname for clearer network information
- **Docker Network Fix**: Improved network IP detection for Docker containers

#### Installation & Maintenance
- **Streamlined Scripts**: Removed `fix-kiosk.sh` script (functionality integrated into main installer)
- **Rollback Updates**: Updated rollback script to match latest install.sh changes
- **Sudo Handling**: Fixed autostart creation when install.sh run with sudo
- **Quick Autostart Script**: Added utility script for quick autostart configuration

### Latest Features (December 2024)

#### Spectator Display
- **Dedicated Spectator View**: Navigate to `/spectator` for full-screen display on secondary screens
- **Simplified Access**: No session ID required - automatically shows active session
- **Auto-Scrolling Stats**: Player statistics scroll automatically with 2-second pauses at top/bottom
- **Previous Round Results**: Displays completed match scores while waiting between rounds
- **Real-time Updates**: Polls active session every 2 seconds for live data
- **Welcome Screen**: Shows setup instructions when no active session exists

#### Customizable Branding
- **App Name Configuration**: Set `VITE_APP_NAME` environment variable to customize branding
- **Default**: "Pickleball Kiosk"
- **Applies To**: All UI screens, player setup, help modal, and spectator display
- **Docker Support**: Build argument support in docker-compose.yml and Dockerfile

#### Help System
- **Built-in Help Modal**: Comprehensive instructions accessible via **?** button
- **Coverage**: Getting Started, During Round, Score Entry, Managing Players, Spectator Display, Tips
- **Positioning**: Bottom-right corner, accessible from all screens
- **Mobile Friendly**: Responsive design for tablets and phones

#### Mobile Optimization
- **Numeric Keyboards**: Score entry fields trigger numeric-only keyboards on mobile devices
- **Input Types**: Uses `type="number"`, `pattern="[0-9]*"`, and `inputMode="numeric"`
- **iOS Compatibility**: Pattern attribute ensures iOS shows numeric keypad (not telephone pad)
- **Faster Score Entry**: Reduces errors and improves speed on tablets

### Features Added

#### Configurable Courts
- **Dynamic Court Configuration**: Changed from fixed 2-court system to configurable 1-unlimited courts
- **Initial Setup**: Court selector in right sidebar on initial screen (default: 2)
- **Between Rounds**: "Change Courts" button in lower left to adjust courts mid-session
- **Validation**: Prevents changing courts during active rounds
- **Player Requirements**: Automatically calculates required players (4 × number of courts)

#### Player Management Enhancements
- **Player Name Validation**: 
  - Maximum 30 characters enforced on input (`maxLength` attribute)
  - Backend validation for 30-character limit
  - Duplicate name prevention
- **Removal Confirmation**: Confirmation dialog when removing players with ✕ button
- **Manual Sit-Out**: 
  - "Sit" button to manually bench players for next round
  - "Play" button to re-activate sitting players
  - Orange highlighting for sitting players
  - Automatic clear of sit-out flag after round generation
- **Active/Sitting Counts**: Display shows "X Active, Y Sitting" player counts
- **No Minimum Restriction**: Removed 4-player minimum for removal (allows full flexibility)

#### Score Management
- **Edit Previous Scores**: 
  - Button to edit most recently completed round
  - Pre-fills existing scores in form
  - Automatic stat reversal and recalculation
  - Disabled when no completed round exists
- **Tie Prevention**: Score entry form prevents submitting tie scores
- **Inline Error Messages**: Validation errors display on specific court cards
- **Round Cancellation**: "Back to Manage" button to cancel current round

#### Statistics Tracking
- **Point Differential**: Tracks total points scored minus points against
- **Cumulative Rounds Sat Out**: Properly accumulates (no longer resets)
- **Tiebreaker System**: Uses point differential and rounds sat out
- **Auto-Scrolling Stats**: Right sidebar auto-scrolls with pause on hover

#### UI/UX Improvements
- **Reset Button**: 
  - Moved to upper left on all screens for consistency
  - Clears error messages when clicked
- **Centered Player Names**: Matchup screen shows centered player names (removed team labels)
- **Responsive Design**: Optimized layouts for desktop browsers
- **Compact Stats Display**: Reduced spacing in player statistics sidebar
- **Inline Validation**: Error messages display inline instead of modals

#### Algorithm Enhancements
- **Weighted Matchup Scoring**:
  - `GAMES_PLAYED_PENALTY = 8` (increased from 3) - prioritizes new/less-played players
  - `BENCH_BONUS = -20` - sitting players get priority
  - `PARTNERSHIP_PENALTY = 10` - varies partnerships
  - `OPPONENT_PENALTY = 5` - varies opponents
- **New Player Priority**: Players added mid-session get higher priority in matchups
- **Forced Sit-Out Handling**: Filters out manually benched players before generating matchups

#### Developer Features
- **Debug Mode**:
  - Configuration: `VITE_DEBUG_MODE=true` in frontend `.env`
  - Auto-fill button (🔧 Fill) on initial screen
  - Generates random player names (e.g., "QuickPanda42", "BoldTiger99")
  - Only appears when below required player count
  - Development/testing only

#### Session Management
- **Error Handling**: Errors no longer reset entire session
- **Temporary Player Storage**: Players can be added before session creation
- **Session Persistence**: Maintains state across page refreshes

### API Changes

#### New Endpoints
- `GET /api/session/active` - Get currently active session without requiring session ID
- `PATCH /api/session/:id/sitout/:playerId` - Toggle player sit-out status
- `PATCH /api/session/:id/courts` - Update number of courts
- `DELETE /api/session/:id/round` - Cancel current round

#### Modified Endpoints
- `POST /api/session` - Now accepts optional `numCourts` parameter
- Session includes `numCourts` field (default: 2)

#### Player Model Updates
- Added `pointDifferential: number` field
- Added `forceSitOut: boolean` field
- `roundsSatOut` now cumulative (not reset between rounds)

### Backend Changes

#### Services
- `gameService.ts`:
  - `getActiveSession()` - Retrieve currently active session
  - `updateNumCourts()` - Change courts between rounds
  - `togglePlayerSitOut()` - Manual sit-out control
  - `cancelCurrentRound()` - Cancel incomplete rounds with stat reversal
  - Enhanced `completeCurrentRound()` - Reverses old stats on re-submission
  - Player name length validation (30 chars)

- `redis.ts`:
  - `getActiveSessionId()` - Retrieve active session ID from Redis
  - Modified `saveSession()` - Tracks active session via "active-session-id" key with 24h TTL

- `roundRobinService.ts`:
  - Filters `forceSitOut` players before matchup generation
  - Increased `GAMES_PLAYED_PENALTY` weight
  - Dynamic court count support

#### Routes
- Added GET `/session/active` endpoint
- Added PATCH `/session/:id/courts` endpoint
- Added PATCH `/session/:id/sitout/:playerId` endpoint
- Added DELETE `/session/:id/round` endpoint
- Added `/spectator` route (simplified from `/spectator/:sessionId`)

### Frontend Changes

#### Components
- `SpectatorDisplay.tsx`:
  - **New Component**: Full-screen spectator view
  - Fetches active session via `/api/session/active` endpoint
  - Auto-scrolling player statistics (2px/20ms with 2s pauses)
  - Displays previous round results between rounds
  - Welcome screen when no session exists
  - 2-second polling interval for live updates

- `HelpModal.tsx`:
  - **New Component**: Comprehensive help system
  - Modal popup with close button
  - Sections for all major features
  - HelpButton component with **?** icon
  
- `config.ts`:
  - **New File**: Centralized configuration constants
  - Exports `APP_NAME` from `VITE_APP_NAME` environment variable

- `PlayerSetup.tsx`:
  - Court selector in sidebar
  - Reset button upper left
  - Debug mode auto-fill button
  - 30-character maxLength on input
  - Removal confirmation dialog
  - Uses `APP_NAME` from config

- `App.tsx`:
  - Added HelpButton to playing view (bottom-right positioning)

- `PlayerManager.tsx`:
  - "Change Courts" button (lower left) with popup selector
  - Sit-out toggle buttons
  - Active/sitting player counts
  - Inline validation messages
  - Removal confirmation dialog
  - 30-character maxLength on input

- `CurrentMatchups.tsx`:
  - Centered player names
  - Removed team labels
  - "Back to Manage" button

- `ScoreEntry.tsx`:
  - Pre-fills existing scores
  - Inline error messages per court
  - Tie prevention validation
  - Numeric keyboard support: `type="number"`, `pattern="[0-9]*"`, `inputMode="numeric"`

- `PlayerStats.tsx`:
  - Right sidebar placement
  - Auto-scroll with hover pause
  - Point differential display
  - Compact layout

#### Hooks
- `useApi.ts`:
  - `updateNumCourts()` method
  - `togglePlayerSitOut()` method
  - `cancelCurrentRound()` method

### Configuration

#### Environment Variables
- `VITE_DEBUG_MODE` - Enable debug features (frontend)
- `VITE_APP_NAME` - Customize app name throughout UI (default: "Pickleball Kiosk")
- `numCourts` - Optional parameter in session creation (default: 2)

#### Docker Configuration
- Added `VITE_APP_NAME` build argument to docker-compose.yml
- Added `VITE_APP_NAME` ARG and ENV to frontend Dockerfile

### Bug Fixes
- Fixed player addition error (temporary storage before session creation)
- Fixed roundsSatOut not accumulating properly
- Fixed score editing not pre-filling values
- Fixed blank screen when editing scores after round cancellation
- Fixed error dialogs resetting entire session
- Fixed new players not getting priority in matchups

### Breaking Changes
None - all changes are backward compatible with existing sessions.

### Migration Notes
- Existing sessions will default to 2 courts
- Player stats will automatically include new `pointDifferential` field (starts at 0)
- Existing `roundsSatOut` values will continue to accumulate properly

### Documentation Updates
- Updated README.md with new features and API endpoints
- Updated QUICKSTART.md with debug mode and new workflow
- Updated LOCAL_DEVELOPMENT.md with testing instructions
- Added this CHANGELOG.md

## Version Info
These changes represent significant feature additions and improvements to the initial release.
