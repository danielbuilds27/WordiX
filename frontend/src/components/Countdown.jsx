import { useState, useEffect } from 'react'

export default function Countdown({ from, round, totalRounds, t }) {
  const [left, setLeft] = useState(from)
  const isFinal = round >= totalRounds

  useEffect(() => { setLeft(from) }, [from])
  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  return (
    <div className="countdown">
      <div className="cd-track">
        <div className="cd-fill" style={{ width: `${(left / from) * 100}%` }} />
      </div>

      {left > 0 ? (
        <p className="cd-text">
          <span className="cd-num" key={left}>
            {isFinal ? t.finalCountdown(left) : t.nextRound(round + 1, totalRounds, left)}
          </span>
        </p>
      ) : (
        <div className="cd-loading">
          <span className="cd-ring" aria-hidden="true" />
          <span className="cd-text cd-text--loading">
            {isFinal ? t.calculating : t.startingRound}
          </span>
        </div>
      )}
    </div>
  )
}
