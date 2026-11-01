import { useId, useState } from 'react'
import { useIssue } from '../lib/formContext'

// Chips input: type a value, press Enter or comma to add it. Backspace removes the last one.
export default function TagInput({ label, name, hint, values, onChange, placeholder, max = 30, required, className = 'span2' }) {
  const id = useId()
  const [text, setText] = useState('')
  const { error, need, touch } = useIssue(name)

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

  const described = [error || need ? `${id}-err` : '', `${id}-hint`].filter(Boolean).join(' ')

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className={`chips${error ? ' invalid' : ''}`}>
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
          data-field={name}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(text)
            touch()
          }}
          placeholder={values.length ? '' : placeholder}
          disabled={values.length >= max}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={described}
        />
      </div>
      {error ? (
        <p className="ferr" id={`${id}-err`}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : need ? (
        <p className="fneed" id={`${id}-err`}>
          {need}
        </p>
      ) : null}
      <p className="hint" id={`${id}-hint`}>
        {hint || 'Type and press Enter or comma to add.'} {values.length}/{max}
      </p>
    </div>
  )
}
