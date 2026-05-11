const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
]

const STATUS_LABEL = { correct: 'correct', present: 'present', absent: 'absent' }

export default function Keyboard({ onKey, letterStatuses }) {
  return (
    <div className="keyboard" role="group" aria-label="Wordix keyboard">
      {ROWS.map((row, i) => (
        <div key={i} className="key-row" role="row">
          {row.map(key => (
            <Key key={key} label={key} status={letterStatuses[key]} onKey={onKey} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Key({ label, status, onKey }) {
  const isWide = label === 'ENTER' || label === '⌫'
  const classes = ['key']
  if (isWide)  classes.push('key-wide')
  if (status)  classes.push(`key-${status}`)

  const ariaLabel =
    label === '⌫'     ? 'Delete last letter' :
    label === 'ENTER'  ? 'Submit guess' :
    status             ? `${label} — ${STATUS_LABEL[status]}` :
                         `Letter ${label}`

  return (
    <button
      className={classes.join(' ')}
      onClick={() => onKey(label === '⌫' ? 'BACKSPACE' : label)}
      aria-label={ariaLabel}
      aria-pressed={status === 'correct' || status === 'present' || undefined}
    >
      {label}
    </button>
  )
}
