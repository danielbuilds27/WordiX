import Toast from './Toast'

const TOTAL_DOTS = 5

export default function WaitingPhase({ game }) {
  const { roomCode, players, t, leaveRoom, showToast, toast, toastType } = game
  const inviteUrl = roomCode ? `${window.location.origin}?room=${roomCode}` : ''

  return (
    <div className="split-layout">

      {/* ── LEFT: big room code ──────────────────────────────────────────── */}
      <div className="split-left split-left--waiting">
        <div>
          <span className="waiting-code-label">{t.roomCodeLabel}</span>
          <div className="waiting-code-display">{roomCode || '······'}</div>
        </div>

        <div className="split-left-bottom">
          <div className="split-players-row">
            {Array.from({ length: TOTAL_DOTS }, (_, i) => (
              <div
                key={i}
                className={`player-dot ${i < players.length ? 'player-dot--active' : 'player-dot--inactive'}`}
              />
            ))}
          </div>
          <div className="split-label">{t.roomCodeHint}</div>
        </div>

        <div className="split-noise-line" />
      </div>

      {/* ── RIGHT: players + invite + leave ─────────────────────────────── */}
      <div className="waiting-split-right">

        <div className="section-tag">
          <span className="section-tag-line" />
          {t.waitingText}
        </div>

        <div className="waiting-player-list">
          {players.map(p => (
            <div key={p.player_id} className="waiting-player-item">
              <span className="waiting-player-emoji">{p.emoji || '🎮'}</span>
              <span className="waiting-player-name">{p.player_name}</span>
              <div className="waiting-player-dot" />
            </div>
          ))}
        </div>

        {inviteUrl && (
          <div className="invite-box">
            <span className="invite-label">{t.inviteLabel}</span>
            <div className="invite-url-row">
              <span className="invite-url">{inviteUrl}</span>
              <button
                className="invite-copy"
                onClick={() =>
                  navigator.clipboard.writeText(inviteUrl)
                    .then(() => showToast(t.linkCopied, 2200, 'success'))
                    .catch(() => showToast(t.copyFailed, 2200, 'error'))
                }
                title={t.inviteLabel}
                aria-label={t.inviteLabel}
              >🔗</button>
            </div>
          </div>
        )}

        <button className="btn-leave-secondary" onClick={leaveRoom}>{t.leaveRoom}</button>

      </div>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
