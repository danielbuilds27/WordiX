import EmojiPicker from './EmojiPicker'
import Toast from './Toast'

const TOTAL_DOTS = 5
const ACTIVE_DOTS = 2

export default function LobbyPhase({ game }) {
  const {
    lobbyStep, setLobbyStep,
    name, setName,
    emoji, setEmoji,
    host, setHost,
    roomCodeInput, setRoomCodeInput,
    hardMode, setHardMode,
    connecting,
    t,
    createRoom,
    joinRoom,
    showToast,
    toast, toastType,
  } = game

  return (
    <div className="split-layout">

      {/* ── LEFT ────────────────────────────────────────────────────────── */}
      <div className="split-left">
        <div className="split-logo">
          W<br />
          <span className="split-logo-accent">OR</span><br />
          DIX
        </div>

        <div className="split-left-bottom">
          <div className="split-players-row">
            {Array.from({ length: TOTAL_DOTS }, (_, i) => (
              <div
                key={i}
                className={`player-dot ${i < ACTIVE_DOTS ? 'player-dot--active' : 'player-dot--inactive'}`}
              />
            ))}
          </div>
          <div className="split-label">{t.subtitle}</div>
          <div className="split-version">v1.0 · multiplayer</div>
        </div>

        <div className="split-noise-line" />
      </div>

      {/* ── RIGHT ───────────────────────────────────────────────────────── */}
      <div className="split-right">

        {lobbyStep === 1 && (
          <>
            <div className="section-tag">
              <span className="section-tag-line" />
              Player setup
            </div>

            <EmojiPicker value={emoji} onChange={setEmoji} />

            <div className="field-block">
              <label className="field-label">{t.nameLabel}</label>
              <input
                className="field-input"
                placeholder={t.namePlaceholder}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')
                    name.trim() ? setLobbyStep(2) : showToast(t.needName, 2200, 'error')
                }}
                autoFocus
              />
            </div>

            <div className="field-block">
              <label className="field-label">{t.serverLabel}</label>
              <input
                className="field-input field-input--muted"
                placeholder="localhost:8765"
                value={host}
                onChange={e => setHost(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                if (!name.trim()) { showToast(t.needName, 2200, 'error'); return }
                setLobbyStep(2)
              }}
            >
              <span>{t.continueBtn}</span>
              <span className="btn-primary-arrow">→</span>
            </button>
          </>
        )}

        {lobbyStep === 2 && (
          <>
            <div className="section-tag">
              <span className="section-tag-line" />
              Game setup
            </div>

            <div className="lobby-topbar">
              <button className="btn-back" onClick={() => setLobbyStep(1)}>{t.backBtn}</button>
            </div>

            <div className="field-block">
              <span className="field-label">{t.hardModeLabel}</span>
              <div className="toggle-row">
                <button
                  className={`toggle-btn${!hardMode ? ' toggle-btn--active' : ''}`}
                  onClick={() => setHardMode(false)}
                  aria-pressed={!hardMode}
                >Normal</button>
                <button
                  className={`toggle-btn${hardMode ? ' toggle-btn--active' : ''}`}
                  onClick={() => setHardMode(true)}
                  aria-pressed={hardMode}
                >🔥 {t.hardMode}</button>
              </div>
            </div>

            <button className="btn-primary" onClick={createRoom} disabled={connecting}>
              {connecting ? <span className="btn-spinner" /> : null}
              <span>{connecting ? '…' : t.createRoom}</span>
              <span className="btn-primary-arrow">→</span>
            </button>

            <div className="divider">{t.orJoinCode}</div>

            <div className="join-row">
              <input
                className="input-code"
                placeholder={t.codePlaceholder}
                value={roomCodeInput}
                onChange={e =>
                  setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
                maxLength={6}
                autoFocus
              />
              <button className="btn-join" onClick={joinRoom} disabled={connecting}>
                {connecting ? <span className="btn-spinner" /> : null}
                {connecting ? '…' : t.joinBtn}
              </button>
            </div>
          </>
        )}

      </div>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
