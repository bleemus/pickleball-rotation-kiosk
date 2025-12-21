import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { SessionSummary } from './SessionSummary';
import { Player } from '../types/game';

describe('SessionSummary', () => {
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Alice',
      gamesPlayed: 5,
      wins: 4,
      losses: 1,
      pointDifferential: 12,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: '2',
      name: 'Bob',
      gamesPlayed: 5,
      wins: 3,
      losses: 2,
      pointDifferential: 5,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: '3',
      name: 'Charlie',
      gamesPlayed: 5,
      wins: 2,
      losses: 3,
      pointDifferential: -3,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: '4',
      name: 'Dave',
      gamesPlayed: 5,
      wins: 1,
      losses: 4,
      pointDifferential: -14,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
  ];

  const mockProps = {
    players: mockPlayers,
    onResetSession: vi.fn(),
    loading: false,
  };

  describe('Rendering', () => {
    it('renders session complete header', () => {
      render(<SessionSummary {...mockProps} />);

      expect(screen.getByText(/Session Complete/)).toBeInTheDocument();
      expect(screen.getByText('Final Rankings')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      render(<SessionSummary {...mockProps} />);

      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getByText('Losses')).toBeInTheDocument();
      expect(screen.getByText('Games')).toBeInTheDocument();
      expect(screen.getByText('+/-')).toBeInTheDocument();
    });

    it('renders all players', () => {
      render(<SessionSummary {...mockProps} />);

      mockPlayers.forEach(player => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
      });
    });

    it('renders Start New Session button', () => {
      render(<SessionSummary {...mockProps} />);

      expect(screen.getByText('Start New Session')).toBeInTheDocument();
    });
  });

  describe('Player Sorting', () => {
    it('sorts players by wins descending', () => {
      render(<SessionSummary {...mockProps} />);

      const playerNames = screen.getAllByRole('row')
        .slice(1) // Skip header row
        .map(row => row.querySelectorAll('td')[1].textContent);

      expect(playerNames).toEqual(['Alice', 'Bob', 'Charlie', 'Dave']);
    });

    it('uses point differential as tiebreaker when wins are equal', () => {
      const playersWithTies: Player[] = [
        {
          ...mockPlayers[0],
          name: 'Player1',
          wins: 3,
          pointDifferential: 10,
        },
        {
          ...mockPlayers[1],
          name: 'Player2',
          wins: 3,
          pointDifferential: 5,
        },
        {
          ...mockPlayers[2],
          name: 'Player3',
          wins: 3,
          pointDifferential: 15,
        },
      ];

      render(<SessionSummary {...mockProps} players={playersWithTies} />);

      const playerNames = screen.getAllByRole('row')
        .slice(1)
        .map(row => row.querySelectorAll('td')[1].textContent);

      // Should be sorted by point differential when wins are equal
      expect(playerNames).toEqual(['Player3', 'Player1', 'Player2']);
    });
  });

  describe('Medal Emojis', () => {
    it('displays gold medal for 1st place', () => {
      render(<SessionSummary {...mockProps} />);

      const firstRow = screen.getAllByRole('row')[1]; // Skip header
      const rankCell = firstRow.querySelector('td');
      expect(rankCell?.textContent).toContain('🥇');
      expect(rankCell?.textContent).toContain('1');
    });

    it('displays silver medal for 2nd place', () => {
      render(<SessionSummary {...mockProps} />);

      const secondRow = screen.getAllByRole('row')[2];
      const rankCell = secondRow.querySelector('td');
      expect(rankCell?.textContent).toContain('🥈');
      expect(rankCell?.textContent).toContain('2');
    });

    it('displays bronze medal for 3rd place', () => {
      render(<SessionSummary {...mockProps} />);

      const thirdRow = screen.getAllByRole('row')[3];
      const rankCell = thirdRow.querySelector('td');
      expect(rankCell?.textContent).toContain('🥉');
      expect(rankCell?.textContent).toContain('3');
    });

    it('displays no medal for 4th place and beyond', () => {
      render(<SessionSummary {...mockProps} />);

      const fourthRow = screen.getAllByRole('row')[4];
      const rankCell = fourthRow.querySelector('td');
      expect(rankCell?.textContent).not.toContain('🥇');
      expect(rankCell?.textContent).not.toContain('🥈');
      expect(rankCell?.textContent).not.toContain('🥉');
      expect(rankCell?.textContent).toContain('4');
    });
  });

  describe('Player Statistics', () => {
    it('displays correct stats for each player', () => {
      render(<SessionSummary {...mockProps} />);

      const rows = screen.getAllByRole('row').slice(1);

      // Alice (1st place)
      expect(rows[0].textContent).toContain('Alice');
      expect(rows[0].textContent).toContain('4'); // wins
      expect(rows[0].textContent).toContain('1'); // losses
      expect(rows[0].textContent).toContain('5'); // games
      expect(rows[0].textContent).toContain('+12'); // point differential
    });

    it('displays positive point differential with + sign', () => {
      render(<SessionSummary {...mockProps} />);

      expect(screen.getByText('+12')).toBeInTheDocument();
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('displays negative point differential without extra sign', () => {
      render(<SessionSummary {...mockProps} />);

      expect(screen.getByText('-3')).toBeInTheDocument();
      expect(screen.getByText('-14')).toBeInTheDocument();
    });

    it('handles zero point differential', () => {
      const playersWithZero: Player[] = [
        {
          ...mockPlayers[0],
          pointDifferential: 0,
        },
      ];

      render(<SessionSummary {...mockProps} players={playersWithZero} />);

      // Zero should display without a sign
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Top Three Highlighting', () => {
    it('highlights top 3 players with yellow background', () => {
      render(<SessionSummary {...mockProps} />);

      const rows = screen.getAllByRole('row').slice(1);

      // Top 3 should have bg-yellow-50
      expect(rows[0]).toHaveClass('bg-yellow-50');
      expect(rows[1]).toHaveClass('bg-yellow-50');
      expect(rows[2]).toHaveClass('bg-yellow-50');

      // 4th place should not
      expect(rows[3]).not.toHaveClass('bg-yellow-50');
    });
  });

  describe('Reset Session', () => {
    it('calls onResetSession when button clicked', async () => {
      const user = userEvent.setup();
      render(<SessionSummary {...mockProps} />);

      await user.click(screen.getByText('Start New Session'));

      expect(mockProps.onResetSession).toHaveBeenCalled();
    });

    it('disables button when loading', () => {
      render(<SessionSummary {...mockProps} loading={true} />);

      expect(screen.getByText('Start New Session')).toBeDisabled();
    });

    it('enables button when not loading', () => {
      render(<SessionSummary {...mockProps} loading={false} />);

      expect(screen.getByText('Start New Session')).toBeEnabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles single player', () => {
      const singlePlayer: Player[] = [mockPlayers[0]];

      render(<SessionSummary {...mockProps} players={singlePlayer} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      const firstRow = screen.getAllByRole('row')[1];
      expect(firstRow.querySelector('td')?.textContent).toContain('🥇');
    });

    it('handles large number of players', () => {
      const manyPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        gamesPlayed: 10 - i,
        wins: 10 - i,
        losses: i,
        pointDifferential: (10 - i) * 3,
        roundsSatOut: 0,
        consecutiveRoundsSatOut: 0,
        forceSitOut: false,
      }));

      render(<SessionSummary {...mockProps} players={manyPlayers} />);

      // All players should be visible
      manyPlayers.forEach(player => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
      });

      // Check that top 3 have medals
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[0].querySelector('td')?.textContent).toContain('🥇');
      expect(rows[1].querySelector('td')?.textContent).toContain('🥈');
      expect(rows[2].querySelector('td')?.textContent).toContain('🥉');
      // 4th place should not have medal
      expect(rows[3].querySelector('td')?.textContent).not.toContain('🥇');
      expect(rows[3].querySelector('td')?.textContent).not.toContain('🥈');
      expect(rows[3].querySelector('td')?.textContent).not.toContain('🥉');
    });
  });
});
