import { describe, it, expect } from "vitest";
import { generateNextRound, updateHistory, reverseHistory } from "./roundRobinService";
import { Player, Match, PartnershipHistory, OpponentHistory } from "../types/game";

// Helper to create a player
function createPlayer(id: string, name: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
    ...overrides,
  };
}

// Helper to create N players
function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => createPlayer(`player-${i + 1}`, `Player${i + 1}`));
}

describe("roundRobinService", () => {
  describe("generateNextRound", () => {
    describe("Basic Functionality", () => {
      it("generates matches for 1 court with 4 players", () => {
        const players = createPlayers(4);
        const result = generateNextRound(players, {}, {}, {}, 1);

        expect(result.matches).toHaveLength(1);
        expect(result.benchedPlayers).toHaveLength(0);
        expect(result.matches[0].courtNumber).toBe(1);
        expect(result.matches[0].completed).toBe(false);
      });

      it("generates matches for 2 courts with 8 players", () => {
        const players = createPlayers(8);
        const result = generateNextRound(players, {}, {}, {}, 2);

        expect(result.matches).toHaveLength(2);
        expect(result.benchedPlayers).toHaveLength(0);
        expect(result.matches[0].courtNumber).toBe(1);
        expect(result.matches[1].courtNumber).toBe(2);
      });

      it("generates matches for 3 courts with 12 players", () => {
        const players = createPlayers(12);
        const result = generateNextRound(players, {}, {}, {}, 3);

        expect(result.matches).toHaveLength(3);
        expect(result.benchedPlayers).toHaveLength(0);
      });

      it("benches extra players when there are more than needed", () => {
        const players = createPlayers(10);
        const result = generateNextRound(players, {}, {}, {}, 2);

        expect(result.matches).toHaveLength(2);
        expect(result.benchedPlayers).toHaveLength(2); // 10 - 8 = 2 benched
      });

      it("each match has 4 unique players", () => {
        const players = createPlayers(8);
        const result = generateNextRound(players, {}, {}, {}, 2);

        for (const match of result.matches) {
          const playerIds = [
            match.team1.player1.id,
            match.team1.player2.id,
            match.team2.player1.id,
            match.team2.player2.id,
          ];
          const uniqueIds = new Set(playerIds);
          expect(uniqueIds.size).toBe(4);
        }
      });

      it("no player appears in multiple matches", () => {
        const players = createPlayers(12);
        const result = generateNextRound(players, {}, {}, {}, 3);

        const allPlayerIds: string[] = [];
        for (const match of result.matches) {
          allPlayerIds.push(
            match.team1.player1.id,
            match.team1.player2.id,
            match.team2.player1.id,
            match.team2.player2.id
          );
        }

        const uniqueIds = new Set(allPlayerIds);
        expect(uniqueIds.size).toBe(allPlayerIds.length);
      });
    });

    describe("Error Handling", () => {
      it("throws error if not enough players for courts", () => {
        const players = createPlayers(4);

        expect(() => generateNextRound(players, {}, {}, {}, 2)).toThrow(
          "Need at least 8 players to generate a round with 2 courts"
        );
      });

      it("throws error if not enough players for 1 court", () => {
        const players = createPlayers(3);

        expect(() => generateNextRound(players, {}, {}, {}, 1)).toThrow(
          "Need at least 4 players to generate a round with 1 court"
        );
      });

      it("throws error when too many players are forced to sit out", () => {
        const players = createPlayers(8).map((p, i) => ({
          ...p,
          forceSitOut: i < 5, // 5 players sitting out, only 3 available
        }));

        expect(() => generateNextRound(players, {}, {}, {}, 1)).toThrow("Not enough players available");
      });
    });

    describe("Force Sit Out", () => {
      it("excludes players marked as forceSitOut from matches", () => {
        const players = createPlayers(8);
        players[0].forceSitOut = true;
        players[1].forceSitOut = true;

        const result = generateNextRound(players, {}, {}, {}, 1);

        // Check that forceSitOut players are not in matches
        const matchPlayerIds = new Set<string>();
        for (const match of result.matches) {
          matchPlayerIds.add(match.team1.player1.id);
          matchPlayerIds.add(match.team1.player2.id);
          matchPlayerIds.add(match.team2.player1.id);
          matchPlayerIds.add(match.team2.player2.id);
        }

        expect(matchPlayerIds.has("player-1")).toBe(false);
        expect(matchPlayerIds.has("player-2")).toBe(false);
      });

      it("includes forceSitOut players in benchedPlayers", () => {
        const players = createPlayers(8);
        players[0].forceSitOut = true;

        const result = generateNextRound(players, {}, {}, {}, 1);

        const benchedIds = result.benchedPlayers.map((p) => p.id);
        expect(benchedIds).toContain("player-1");
      });
    });

    describe("Partnership History Optimization", () => {
      it("avoids pairing players who have partnered before", () => {
        const players = createPlayers(8);
        const partnershipHistory: PartnershipHistory = {
          "player-1-player-2": 5, // Strong partnership history
        };

        const result = generateNextRound(players, partnershipHistory, {}, {}, 2);

        // Check that player-1 and player-2 are not on the same team
        for (const match of result.matches) {
          const team1Ids = [match.team1.player1.id, match.team1.player2.id];
          const team2Ids = [match.team2.player1.id, match.team2.player2.id];

          const player1InTeam1 = team1Ids.includes("player-1");
          const player2InTeam1 = team1Ids.includes("player-2");
          const player1InTeam2 = team2Ids.includes("player-1");
          const player2InTeam2 = team2Ids.includes("player-2");

          // They should not be on the same team
          expect(player1InTeam1 && player2InTeam1).toBe(false);
          expect(player1InTeam2 && player2InTeam2).toBe(false);
        }
      });
    });

    describe("Bench Priority", () => {
      it("prioritizes players who have sat out more rounds", () => {
        const players = createPlayers(6);
        players[0].roundsSatOut = 3;
        players[1].roundsSatOut = 3;
        players[2].roundsSatOut = 3;
        players[3].roundsSatOut = 3;
        players[4].roundsSatOut = 0;
        players[5].roundsSatOut = 0;

        const result = generateNextRound(players, {}, {}, {}, 1);

        // Players who sat out more should be playing
        const matchPlayerIds = new Set<string>();
        for (const match of result.matches) {
          matchPlayerIds.add(match.team1.player1.id);
          matchPlayerIds.add(match.team1.player2.id);
          matchPlayerIds.add(match.team2.player1.id);
          matchPlayerIds.add(match.team2.player2.id);
        }

        // Players with more sat out rounds should be prioritized
        const benchedIds = result.benchedPlayers.map((p) => p.id);

        // At least one of the players who sat out 0 times should be benched
        const zeroSatOutBenched = benchedIds.filter((id) => id === "player-5" || id === "player-6");
        expect(zeroSatOutBenched.length).toBeGreaterThan(0);
      });

      it("strongly prioritizes players with consecutive sit outs", () => {
        const players = createPlayers(6);
        players[0].consecutiveRoundsSatOut = 2;
        players[1].consecutiveRoundsSatOut = 2;
        players[2].consecutiveRoundsSatOut = 2;
        players[3].consecutiveRoundsSatOut = 2;
        players[4].consecutiveRoundsSatOut = 0;
        players[5].consecutiveRoundsSatOut = 0;

        const result = generateNextRound(players, {}, {}, {}, 1);

        // Players who sat out consecutively should definitely be playing
        const matchPlayerIds = new Set<string>();
        for (const match of result.matches) {
          matchPlayerIds.add(match.team1.player1.id);
          matchPlayerIds.add(match.team1.player2.id);
          matchPlayerIds.add(match.team2.player1.id);
          matchPlayerIds.add(match.team2.player2.id);
        }

        // All players with consecutive sit outs should be playing
        expect(matchPlayerIds.has("player-1")).toBe(true);
        expect(matchPlayerIds.has("player-2")).toBe(true);
        expect(matchPlayerIds.has("player-3")).toBe(true);
        expect(matchPlayerIds.has("player-4")).toBe(true);
      });
    });
  });

  describe("updateHistory", () => {
    it("updates partnership history for completed matches", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const result = updateHistory([match], {}, {}, {});

      // Check partnership keys
      const team1Key = ["player-1", "player-2"].sort().join("-");
      const team2Key = ["player-3", "player-4"].sort().join("-");

      expect(result.partnershipHistory[team1Key]).toBe(1);
      expect(result.partnershipHistory[team2Key]).toBe(1);
    });

    it("updates opponent history for all cross-team pairs", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const result = updateHistory([match], {}, {}, {});

      // Check opponent history (4 pairs: 1v3, 1v4, 2v3, 2v4)
      expect(result.opponentHistory[["player-1", "player-3"].sort().join("-")]).toBe(1);
      expect(result.opponentHistory[["player-1", "player-4"].sort().join("-")]).toBe(1);
      expect(result.opponentHistory[["player-2", "player-3"].sort().join("-")]).toBe(1);
      expect(result.opponentHistory[["player-2", "player-4"].sort().join("-")]).toBe(1);
    });

    it("increments existing history counts", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const existingPartnershipHistory: PartnershipHistory = {
        "player-1-player-2": 2,
      };

      const result = updateHistory([match], existingPartnershipHistory, {}, {});

      expect(result.partnershipHistory["player-1-player-2"]).toBe(3);
    });

    it("handles multiple matches", () => {
      const players = createPlayers(8);
      const matches: Match[] = [
        {
          id: "match-1",
          courtNumber: 1,
          team1: { player1: players[0], player2: players[1] },
          team2: { player1: players[2], player2: players[3] },
          completed: true,
          team1Score: 11,
          team2Score: 9,
          servingTeam: 1,
        },
        {
          id: "match-2",
          courtNumber: 2,
          team1: { player1: players[4], player2: players[5] },
          team2: { player1: players[6], player2: players[7] },
          completed: true,
          team1Score: 11,
          team2Score: 7,
          servingTeam: 1,
        },
      ];

      const result = updateHistory(matches, {}, {}, {});

      expect(result.partnershipHistory["player-1-player-2"]).toBe(1);
      expect(result.partnershipHistory["player-5-player-6"]).toBe(1);
    });
  });

  describe("reverseHistory", () => {
    it("decrements partnership history", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const existingHistory: PartnershipHistory = {
        "player-1-player-2": 3,
        "player-3-player-4": 2,
      };

      const result = reverseHistory([match], existingHistory, {}, {});

      expect(result.partnershipHistory["player-1-player-2"]).toBe(2);
      expect(result.partnershipHistory["player-3-player-4"]).toBe(1);
    });

    it("decrements opponent history", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const existingOpponentHistory: OpponentHistory = {
        "player-1-player-3": 2,
        "player-1-player-4": 2,
        "player-2-player-3": 2,
        "player-2-player-4": 2,
      };

      const result = reverseHistory([match], {}, existingOpponentHistory, {});

      expect(result.opponentHistory["player-1-player-3"]).toBe(1);
      expect(result.opponentHistory["player-1-player-4"]).toBe(1);
      expect(result.opponentHistory["player-2-player-3"]).toBe(1);
      expect(result.opponentHistory["player-2-player-4"]).toBe(1);
    });

    it("does not go below zero", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const existingHistory: PartnershipHistory = {
        "player-1-player-2": 0,
      };

      const result = reverseHistory([match], existingHistory, {}, {});

      // Should not decrement since it would go negative
      expect(result.partnershipHistory["player-1-player-2"]).toBe(0);
    });

    it("is the inverse of updateHistory", () => {
      const players = createPlayers(4);
      const match: Match = {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: players[0], player2: players[1] },
        team2: { player1: players[2], player2: players[3] },
        completed: true,
        team1Score: 11,
        team2Score: 9,
        servingTeam: 1,
      };

      const initialPartnershipHistory: PartnershipHistory = {
        "player-1-player-2": 5,
      };
      const initialOpponentHistory: OpponentHistory = {
        "player-1-player-3": 3,
      };

      // Update history
      const updated = updateHistory([match], initialPartnershipHistory, initialOpponentHistory, {});

      // Reverse it
      const reversed = reverseHistory([match], updated.partnershipHistory, updated.opponentHistory, updated.courtHistory);

      // Should be back to original
      expect(reversed.partnershipHistory["player-1-player-2"]).toBe(5);
      expect(reversed.opponentHistory["player-1-player-3"]).toBe(3);
    });
  });
});
