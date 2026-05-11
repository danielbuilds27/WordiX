import Scoreboard from './Scoreboard'
import Countdown from './Countdown'
import Toast from './Toast'

export default function GameOverPhase({ game }) {
  const { gameOverData, round, totalRounds, t, shareResult, leaveRoom, toast, toastType } = game
  if (!gameOverData) return null

  return (
    <div className="gameover-layout">

      {/* ── LEFT: winner + word reveal ───────────────────────────────────── */}
      <div className="gameover-left">
        <span className="gameover-logo">WORDIX</span>

        <div>
          <div className="gameover-round-badge">{t.roundOf(round, totalRounds)}</div>
          <div className={`gameover-winner${!gameOverData.winner ? ' gameover-winner--none' : ''}`}>
            {gameOverData.winner ?? '—'}
          </div>
          <div className="gameover-sub">
            {gameOverData.winner ? '🏆' : t.noWinner}
          </div>
        </div>

        <div>
          <div className="gameover-word-label">{t.wordWas}</div>
          <div className="gameover-word-reveal">{gameOverData.word}</div>
        </div>

        <div className="gameover-left-bottom">
          <button className="btn-share-dark" onClick={shareResult}>{t.shareBtn}</button>
          <button className="btn-leave-dark" onClick={leaveRoom} title={t.leaveRoom}>✕</button>
        </div>

        <div className="split-noise-line" />
      </div>

      {/* ── RIGHT: scoreboard + countdown ───────────────────────────────── */}
      <div className="gameover-right">
        <div className="gameover-section-tag">
          <span className="section-tag-line" />
          Scoreboard
        </div>
        <Scoreboard leaderboard={gameOverData.leaderboard} t={t} />
        <Countdown from={10} round={round} totalRounds={totalRounds} t={t} />
      </div>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
