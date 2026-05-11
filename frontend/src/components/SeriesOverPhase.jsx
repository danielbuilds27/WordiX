import Toast from './Toast'

export default function SeriesOverPhase({ game }) {
  const { seriesData, t, toast, toastType } = game
  if (!seriesData) return null

  const { champion, standings, total_rounds } = seriesData
  const maxScore = Math.max(...standings.map(s => s.total_score), 1)

  return (
    <div className="series-layout">

      {/* ── LEFT: champion ───────────────────────────────────────────────── */}
      <div className="series-left">
        <span className="gameover-logo">WORDIX</span>

        <div>
          <div className="series-crown">👑</div>
          <div className="series-title-label">{t.seriesChampion}</div>
          <div className="series-champion-name">
            {standings[0]?.emoji} {champion}
          </div>
          <div className="series-subtitle">{t.roundsComplete(total_rounds)}</div>
        </div>

        <div className="split-left-bottom">
          <div className="split-label waiting-text">{t.newSeries}</div>
        </div>

        <div className="split-noise-line" />
      </div>

      {/* ── RIGHT: standings ─────────────────────────────────────────────── */}
      <div className="series-right">
        <div className="section-tag">
          <span className="section-tag-line" />
          Standings
        </div>

        <div className="series-standings">
          {standings.map((s, i) => (
            <div key={s.player} className={`series-row${i === 0 ? ' series-row--first' : ''}`}>
              <span className="series-medal">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
              <span className="series-avatar">{s.emoji || '🎮'}</span>
              <div className="series-info">
                <div className="series-name-line">
                  <span className="series-name">{s.player}</span>
                  <span className="series-wins">{s.rounds_won} 🏆</span>
                  <span className="series-score-total">{s.total_score} {t.scorePts}</span>
                </div>
                <div className="series-bar-track">
                  <div
                    className="series-bar-fill"
                    style={{ width: `${(s.total_score / maxScore) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
