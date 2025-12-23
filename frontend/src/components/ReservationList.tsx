import { Reservation } from "../types/game";

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  onAddPlayers: (players: string[]) => void;
}

export function ReservationList({
  reservations,
  loading,
  error,
  onAddPlayers,
}: ReservationListProps) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Email Reservations
        </h3>
        <p className="text-blue-600">Loading reservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Email Reservations
        </h3>
        <p className="text-yellow-600 text-sm">
          Unable to load reservations from email parser
        </p>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Email Reservations
        </h3>
        <p className="text-gray-600 text-sm">
          No reservations found in recent emails
        </p>
      </div>
    );
  }

  // Filter to today's reservations
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const todaysReservations = reservations.filter((res) => {
    const resDate = new Date(res.date).toISOString().split("T")[0];
    return resDate === todayStr;
  });

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-green-900 mb-3">
        Today's Reservations from Email
      </h3>

      {todaysReservations.length === 0 ? (
        <p className="text-green-600 text-sm">
          No reservations for today. Showing all recent reservations:
        </p>
      ) : null}

      <div className="space-y-3">
        {(todaysReservations.length > 0
          ? todaysReservations
          : reservations.slice(0, 3)
        ).map((reservation) => {
          const resDate = new Date(reservation.date);
          const isToday =
            resDate.toISOString().split("T")[0] === todayStr;

          return (
            <div
              key={reservation.id}
              className={`${
                isToday ? "bg-white" : "bg-gray-50"
              } border border-green-300 rounded p-3`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-gray-900">
                    {reservation.court} • {reservation.startTime} -{" "}
                    {reservation.endTime}
                  </div>
                  <div className="text-sm text-gray-600">
                    {resDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {!isToday && " (not today)"}
                  </div>
                </div>
                <button
                  onClick={() => onAddPlayers(reservation.players)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Add Players
                </button>
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Players:</span>{" "}
                {reservation.players.join(", ")}
              </div>
            </div>
          );
        })}
      </div>

      {reservations.length > 3 && todaysReservations.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Showing {Math.min(3, reservations.length)} of {reservations.length}{" "}
          recent reservations
        </p>
      )}
    </div>
  );
}
