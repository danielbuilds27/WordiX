export default function Scoreboard({ leaderboard, t }) {
  const maxTotal = Math.max(...leaderboard.map(e => e.total_score), 1)

  return (
    <div className="scoreboard">
      {leaderboard.map((entry, i) => (
        <ScoreRow key={entry.player} entry={entry} rank={i + 1} maxTotal={maxTotal} t={t} />
      ))}
    </div>
  )
}

function ScoreRow({ entry, rank, maxTotal, t }) {
  const medals  = ['🥇', '🥈', '🥉']
  const medal   = medals[rank - 1] ?? `${rank}.`
  const barPct  = maxTotal > 0 ? (entry.total_score / maxTotal) * 100 : 0

  return (
    <div className={`score-row${rank === 1 ? ' score-row--first' : ''}`}>
      <span className="score-medal">{medal}</span>
      <span className="score-avatar">{entry.emoji || '🎮'}</span>
      <div className="score-body">

        <div className="score-header-line">
          <span className="score-name">{entry.player}</span>
          <span className={`score-round-pts ${entry.round_score > 0 ? 'pts-positive' : 'pts-zero'}`}>
            {entry.round_score > 0 ? `+${entry.round_score}` : '+0'} {t.scorePts}
          </span>
        </div>

        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${barPct}%` }} />
        </div>

        <div className="score-footer-line">
          {entry.won
            ? <span className="score-breakdown">
                {entry.base} {t.scoreBase} · {entry.attempt_bonus} {t.scoreAttempts} · {entry.speed_bonus} {t.scoreSpeed}
                {entry.hint_penalty > 0 && ` · -${entry.hint_penalty} ${t.scoreHints}`}
              </span>
            : <span className="score-breakdown score-breakdown--lost">{t.scoreLost}</span>
          }
          <span className="score-total-pts">{entry.total_score} {t.scoreTotalPts}</span>
        </div>

      </div>
    </div>
  )
}
