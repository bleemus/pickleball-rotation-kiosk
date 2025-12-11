# Changelog

## Recent Updates

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
  - `updateNumCourts()` - Change courts between rounds
  - `togglePlayerSitOut()` - Manual sit-out control
  - `cancelCurrentRound()` - Cancel incomplete rounds with stat reversal
  - Enhanced `completeCurrentRound()` - Reverses old stats on re-submission
  - Player name length validation (30 chars)

- `roundRobinService.ts`:
  - Filters `forceSitOut` players before matchup generation
  - Increased `GAMES_PLAYED_PENALTY` weight
  - Dynamic court count support

#### Routes
- Added PATCH `/session/:id/courts` endpoint
- Added PATCH `/session/:id/sitout/:playerId` endpoint
- Added DELETE `/session/:id/round` endpoint

### Frontend Changes

#### Components
- `PlayerSetup.tsx`:
  - Court selector in sidebar
  - Reset button upper left
  - Debug mode auto-fill button
  - 30-character maxLength on input
  - Removal confirmation dialog

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
- `numCourts` - Optional parameter in session creation (default: 2)

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
