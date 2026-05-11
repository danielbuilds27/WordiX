export default function GuessGrid({ guesses, currentGuess, maxAttempts, wordLength, shakeRow, bounceRow, t }) {
  const rows = Array.from({ length: maxAttempts }, (_, i) => {
    if (i < guesses.length)   return { type: 'past',    data: guesses[i] }
    if (i === guesses.length) return { type: 'current', word: currentGuess }
    return { type: 'empty' }
  })

  return (
    <div
      className="guess-grid"
      role="grid"
      aria-label={t.ariaGrid(guesses.length, maxAttempts)}
    >
      {rows.map((row, i) => (
        <GuessRow
          key={i}
          row={row}
          rowIndex={i}
          wordLength={wordLength}
          shaking={shakeRow === i}
          bouncing={bounceRow === i}
          t={t}
        />
      ))}
    </div>
  )
}

function GuessRow({ row, rowIndex, wordLength, shaking, bouncing, t }) {
  const tiles = Array.from({ length: wordLength }, (_, i) => {
    if (row.type === 'past') {
      const f = row.data.feedback[i]
      return { letter: f.letter, status: f.status }
    }
    if (row.type === 'current') return { letter: row.word[i] || '', status: null }
    return { letter: '', status: null }
  })

  const classes = ['guess-row']
  if (shaking)  classes.push('shake')
  if (bouncing) classes.push('bounce')

  const statusLabel = (s) =>
    s === 'correct' ? t.ariaCorrect : s === 'present' ? t.ariaPresent : t.ariaAbsent

  const rowLabel = row.type === 'past'
    ? `${t.ariaRowPast(rowIndex + 1)}: ${tiles.map(ti => `${ti.letter} ${statusLabel(ti.status)}`).join(', ')}`
    : row.type === 'current'
    ? `${t.ariaRowNow}: ${tiles.map(ti => ti.letter || t.ariaEmpty).join(', ')}`
    : t.ariaRowEmpty(rowIndex + 1)

  return (
    <div className={classes.join(' ')} role="row" aria-label={rowLabel}>
      {tiles.map((tile, i) => (
        <Tile key={i} tile={tile} t={t} />
      ))}
    </div>
  )
}

function Tile({ tile, t }) {
  const { letter, status } = tile

  const ariaLabel = status
    ? `${letter} — ${status === 'correct' ? t.ariaCorrect : status === 'present' ? t.ariaPresent : t.ariaAbsent}`
    : letter
    ? t.ariaLetter(letter)
    : t.ariaEmpty

  return (
    <div
      className={`tile${letter && !status ? ' has-letter' : ''}`}
      data-status={status || undefined}
      role="gridcell"
      aria-label={ariaLabel}
    >
      {letter}
    </div>
  )
}
