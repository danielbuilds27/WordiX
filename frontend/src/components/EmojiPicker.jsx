import { useState, useEffect, useRef } from 'react'

const EMOJIS = [
  '😀','😎','🤩','🥳','😈','👻','🤖','👽',
  '🦊','🐺','🐱','🐻','🦁','🐯','🦄','🐸',
  '🐼','🦋','🌟','🔥','💎','⚡','🎯','🚀',
  '⚽','🏆','🎸','🎮','🧠','👾','🍕','🌈',
  '🐲','🦅','🐬','🦈','🍀','❄️','🪐','🎭',
]

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef}>
      <div
        className={`avatar-block${open ? ' avatar-block--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Avatar: ${value}. Click to change.`}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
      >
        <div className="avatar-icon">{value}</div>
        <div className="avatar-text">
          <div className="avatar-type">Selected avatar</div>
          <div className="avatar-val">{value}</div>
        </div>
        <div className="avatar-change">Change →</div>
      </div>

      {open && (
        <div className="emoji-grid-panel">
          <div className="emoji-grid-panel-title">Pick your avatar</div>
          <div className="emoji-grid" role="listbox" aria-label="Pick an avatar">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                role="option"
                aria-selected={value === e}
                className={`emoji-btn${value === e ? ' emoji-btn--active' : ''}`}
                onClick={() => { onChange(e); setOpen(false) }}
                aria-label={e}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
