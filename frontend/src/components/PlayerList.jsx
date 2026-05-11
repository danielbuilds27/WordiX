export default function PlayerList({ players }) {
  if (!players.length) return null

  return (
    <div className="player-list">
      {players.map(p => (
        <span
          key={p.player_id}
          className={`player-chip ${p.won ? 'chip-won' : p.finished ? 'chip-done' : ''}`}
          title={p.won ? `Won in ${p.attempts} guess${p.attempts === 1 ? '' : 'es'}` : p.finished ? 'Out' : 'Playing…'}
        >
          <span className="chip-avatar">{p.emoji || '🎮'}</span>
          <span className="chip-name">{p.player_name}</span>
          {p.won && <span className="chip-badge chip-badge--won">✓</span>}
          {p.finished && !p.won && <span className="chip-badge chip-badge--out">✕</span>}
        </span>
      ))}
    </div>
  )
}
