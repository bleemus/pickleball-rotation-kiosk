import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { PlayerSetup } from './PlayerSetup';
import { Player } from '../types/game';

describe('PlayerSetup', () => {
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Alice',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: '2',
      name: 'Bob',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
  ];

  const mockProps = {
    players: [],
    onAddPlayer: vi.fn(),
    onRemovePlayer: vi.fn(),
    onStartGame: vi.fn(),
    onResetSession: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with empty player list', () => {
      render(<PlayerSetup {...mockProps} />);
      expect(screen.getByText('No players added yet')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter player name')).toBeInTheDocument();
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('renders player list when players exist', () => {
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Players (2)')).toBeInTheDocument();
    });

    it('displays court count correctly', () => {
      render(<PlayerSetup {...mockProps} />);
      // Default is 2 courts
      expect(screen.getAllByText('2')[0]).toBeInTheDocument();
    });
  });

  describe('Adding Players', () => {
    it('calls onAddPlayer when adding a valid player', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      const input = screen.getByPlaceholderText('Enter player name');
      await user.type(input, 'Charlie');
      await user.click(screen.getByText('Add'));

      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('Charlie');
    });

    it('trims whitespace from player names', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      const input = screen.getByPlaceholderText('Enter player name');
      await user.type(input, '  Charlie  ');
      await user.click(screen.getByText('Add'));

      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('Charlie');
    });

    it('clears input after adding player', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      const input = screen.getByPlaceholderText('Enter player name') as HTMLInputElement;
      await user.type(input, 'Charlie');
      await user.click(screen.getByText('Add'));

      expect(input.value).toBe('');
    });

    it('shows error for empty player name', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      await user.click(screen.getByText('Add'));

      expect(await screen.findByText('Please enter a player name')).toBeInTheDocument();
      expect(mockProps.onAddPlayer).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only player name', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      const input = screen.getByPlaceholderText('Enter player name');
      await user.type(input, '   ');
      await user.click(screen.getByText('Add'));

      expect(await screen.findByText('Please enter a player name')).toBeInTheDocument();
      expect(mockProps.onAddPlayer).not.toHaveBeenCalled();
    });

    it('respects max length of 30 characters in input', () => {
      render(<PlayerSetup {...mockProps} />);

      const input = screen.getByPlaceholderText('Enter player name') as HTMLInputElement;

      // Input has maxLength attribute set to 30
      expect(input.maxLength).toBe(30);
    });

    it('shows error for duplicate player name (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);

      const input = screen.getByPlaceholderText('Enter player name');
      await user.type(input, 'alice'); // lowercase
      await user.click(screen.getByText('Add'));

      expect(await screen.findByText('Player name already exists')).toBeInTheDocument();
      expect(mockProps.onAddPlayer).not.toHaveBeenCalled();
    });

    it('clears error when typing after validation error', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      // Trigger error
      await user.click(screen.getByText('Add'));
      expect(await screen.findByText('Please enter a player name')).toBeInTheDocument();

      // Type valid name - error should be cleared
      const input = screen.getByPlaceholderText('Enter player name');
      await user.type(input, 'Charlie');
      await user.click(screen.getByText('Add'));

      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('Charlie');
      expect(screen.queryByText('Please enter a player name')).not.toBeInTheDocument();
    });
  });

  describe('Removing Players', () => {
    it('calls onRemovePlayer when removing a player after confirmation', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);

      const removeButtons = screen.getAllByText('✕');
      await user.click(removeButtons[0]);

      // Confirmation is auto-confirmed by mock in setup.ts
      expect(mockProps.onRemovePlayer).toHaveBeenCalledWith('1');
    });

    it('does not remove player if confirmation is cancelled', async () => {
      const user = userEvent.setup();
      // Override confirm to return false
      window.confirm = vi.fn(() => false);
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);

      const removeButtons = screen.getAllByText('✕');
      await user.click(removeButtons[0]);

      expect(mockProps.onRemovePlayer).not.toHaveBeenCalled();
    });
  });

  describe('Court Count Selection', () => {
    it('increments court count when plus button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      // Find the + button (there are multiple, get the first one for mobile view)
      const plusButtons = screen.getAllByText('+');
      await user.click(plusButtons[0]);

      // Court count should be 3 now
      expect(screen.getAllByText('3')[0]).toBeInTheDocument();
    });

    it('decrements court count when minus button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      // Find the − button
      const minusButtons = screen.getAllByText('−');
      await user.click(minusButtons[0]);

      // Court count should be 1 now (minimum)
      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
    });

    it('does not decrement court count below 1', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      const minusButtons = screen.getAllByText('−');
      // Click multiple times
      await user.click(minusButtons[0]);
      await user.click(minusButtons[0]);
      await user.click(minusButtons[0]);

      // Should still be 1
      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
    });
  });

  describe('Start Game Button', () => {
    it('is disabled when fewer than required players', () => {
      // Need 8 players for 2 courts (2 * 4)
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);

      const startButton = screen.getByText('Start Game');
      expect(startButton).toBeDisabled();
    });

    it('is enabled when enough players are added', () => {
      const fourPlayers: Player[] = Array.from({ length: 4 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointDifferential: 0,
        roundsSatOut: 0,
        consecutiveRoundsSatOut: 0,
        forceSitOut: false,
      }));

      render(<PlayerSetup {...mockProps} players={fourPlayers} />);

      // With 1 court selected
      const minusButtons = screen.getAllByText('−');
      userEvent.click(minusButtons[0]);

      waitFor(() => {
        const startButton = screen.getByText('Start Game');
        expect(startButton).toBeEnabled();
      });
    });

    it('calls onStartGame with correct number of courts', async () => {
      const user = userEvent.setup();
      const eightPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointDifferential: 0,
        roundsSatOut: 0,
        consecutiveRoundsSatOut: 0,
        forceSitOut: false,
      }));

      render(<PlayerSetup {...mockProps} players={eightPlayers} />);

      const startButton = screen.getByText('Start Game');
      await user.click(startButton);

      expect(mockProps.onStartGame).toHaveBeenCalledWith(2);
    });

    it('displays correct message based on player count', () => {
      render(<PlayerSetup {...mockProps} players={mockPlayers} />);

      // Need 8 players for 2 courts, have 2 players
      expect(screen.getByText(/Add 6 more players to start/)).toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      const fourPlayers: Player[] = Array.from({ length: 4 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointDifferential: 0,
        roundsSatOut: 0,
        consecutiveRoundsSatOut: 0,
        forceSitOut: false,
      }));

      render(<PlayerSetup {...mockProps} players={fourPlayers} loading={true} />);

      const startButton = screen.getByText('Starting...');
      expect(startButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('disables input when loading', () => {
      render(<PlayerSetup {...mockProps} loading={true} />);

      const input = screen.getByPlaceholderText('Enter player name');
      expect(input).toBeDisabled();
    });

    it('disables all buttons when loading', () => {
      render(<PlayerSetup {...mockProps} players={mockPlayers} loading={true} />);

      const addButton = screen.getByText('Add');
      const startButton = screen.getByText('Starting...');
      const resetButtons = screen.getAllByText('Reset');

      expect(addButton).toBeDisabled();
      expect(startButton).toBeDisabled();
      expect(resetButtons[0]).toBeDisabled();
    });
  });

  describe('Reset Session', () => {
    it('calls onResetSession when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlayerSetup {...mockProps} />);

      // Mobile reset button
      const resetButtons = screen.getAllByText('Reset');
      await user.click(resetButtons[0]);

      expect(mockProps.onResetSession).toHaveBeenCalled();
    });
  });
});
