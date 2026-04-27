/**
 * Waiting room screen for matchmaking and private room invites.
 * It gives players a stable place to wait while the authoritative match
 * is being formed or while another player joins a private room.
 */

interface LobbyScreenProps {
  modeLabel: string;
  matchmakerTicket: string | null;
  privateRoomCode: string | null;
}

/**
 * Renders the active lobby state and shareable room information.
 *
 * @param props Current queue or private room metadata.
 * @returns A waiting-room panel.
 */
export function LobbyScreen({
  modeLabel,
  matchmakerTicket,
  privateRoomCode,
}: LobbyScreenProps) {
  return (
    <section className="panel lobby-panel">
      <div className="panel-header">
        <p className="eyebrow">Lobby</p>
        <h1>Finding opponent...</h1>
        <p className="panel-copy">
          Nakama is pairing this match in <strong>{modeLabel}</strong> mode.
        </p>
      </div>

      <div className="spinner-shell" aria-label="Searching">
        <div className="spinner-ring" />
      </div>

      {matchmakerTicket ? (
        <div className="lobby-detail-card">
          <span className="detail-label">Matchmaker Ticket</span>
          <code>{matchmakerTicket}</code>
        </div>
      ) : null}

      {privateRoomCode ? (
        <div className="lobby-detail-card">
          <span className="detail-label">Private Room Code</span>
          <code>{privateRoomCode}</code>
        </div>
      ) : null}

      <p className="lobby-footnote">
        Stay on this screen. The game will open automatically once the match
        is ready.
      </p>
    </section>
  );
}
