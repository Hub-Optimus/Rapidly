import { useId, useState } from 'react'

// Chips input: type a value, press Enter or comma to add it. Backspace removes the last one.
export default function TagInput({ label, hint, values, onChange, placeholder, max = 30, className = 'span2' }) {
  const id = useId()
  const [text, setText] = useState('')

  function add(raw) {
    const parts = raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    if (!parts.length) {
      setText('')
      return
    }
    const next = [...values]
    for (const p of parts) {
      if (next.length >= max) break
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 60))
    }
    onChange(next)
    setText('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(text)
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className="chips">
        {values.map((v) => (
          <span className="chip" key={v}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(text)}
          placeholder={values.length ? '' : placeholder}
          disabled={values.length >= max}
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p className="hint" id={`${id}-hint`}>
        {hint || 'Type and press Enter or comma to add.'} {values.length}/{max}
      </p>
    </div>
  )
}
