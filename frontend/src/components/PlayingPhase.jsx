import GuessGrid from './GuessGrid'
import Keyboard from './Keyboard'
import PlayerList from './PlayerList'
import Toast from './Toast'

export default function PlayingPhase({ game }) {
  const {
    liveMsg,
    round, totalRounds,
    timeLeft,
    hardModeGame,
    roomCode,
    players,
    won,
    hints,
    hintsUsed,
    maxHints,
    hintPenalty,
    submitting,
    toast, toastType,
    t,
    guesses, currentGuess, maxAttempts, wordLength,
    shakeRow, bounceRow,
    letterStatuses,
    onKey,
    requestHint,
    copyRoomCode,
    leaveRoom,
  } = game

  return (
    <div className="app playing">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{liveMsg}</div>

      <header className="playing-header">
        <span className="playing-logo">WORDIX</span>
        <div className="header-badges">
          <span className="round-badge">R{round}/{totalRounds}</span>
          {timeLeft !== null && (
            <span className={`timer-badge${timeLeft <= 15 ? ' timer-badge--urgent' : ''}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
          {hardModeGame && <span className="hard-badge" title="Hard mode">🔥</span>}
          <span className="lang-badge">🇬🇧</span>
          {roomCode && (
            <button className="room-badge" onClick={copyRoomCode} title={t.roomCodeLabel}>
              {roomCode}
            </button>
          )}
          <button className="btn-leave" onClick={leaveRoom} title={t.leaveRoom}>✕</button>
        </div>
      </header>

      <div className="players-row">
        <PlayerList players={players} />
      </div>

      {won && <div className="win-banner">{t.winBanner}</div>}
      {toast && !won && <Toast message={toast} type={toastType} />}

      <div className="hint-bar">
        <div className="hint-tiles">
          {Array.from({ length: wordLength }, (_, i) => {
            const h = hints.find(h => h.position === i)
            return (
              <div key={i} className={`hint-tile${h ? ' hint-tile--revealed' : ''}`}>
                {h ? h.letter : ''}
              </div>
            )
          })}
        </div>
        <button
          className="btn-hint"
          onClick={requestHint}
          disabled={won || submitting || hintsUsed >= maxHints}
          title={t.hintBtn(maxHints - hintsUsed, hintPenalty)}
        >
          {t.hintBtn(maxHints - hintsUsed, hintPenalty)}
        </button>
      </div>

      <GuessGrid
        guesses={guesses}
        currentGuess={currentGuess}
        maxAttempts={maxAttempts}
        wordLength={wordLength}
        shakeRow={shakeRow}
        bounceRow={bounceRow}
        t={t}
      />
      <Keyboard onKey={onKey} letterStatuses={letterStatuses} />
    </div>
  )
}
