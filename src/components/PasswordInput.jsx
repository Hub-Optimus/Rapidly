import { useState } from 'react'

// Password box with a Show/Hide toggle (so users can check what they typed)
export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  autoComplete,
  minLength,
  ariaLabel,
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw-wrap">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
