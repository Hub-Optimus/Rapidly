import { useId } from 'react'

function Wrap({ id, label, hint, extra, required, className = '', children }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {(hint || extra) && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
          {hint && extra ? ' ' : ''}
          {extra}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, value, onChange, hint, required, className, ...rest }) {
  const id = useId()
  return (
    <Wrap id={id} label={label} hint={hint} required={required} className={className}>
      <input
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        aria-required={required || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Wrap>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  required,
  className,
  placeholder = 'Select',
  allowEmpty = true,
  ...rest
}) {
  const id = useId()
  const opts = options.map((o) => (typeof o === 'object' ? o : { v: String(o), l: String(o) }))
  return (
    <Wrap id={id} label={label} hint={hint} required={required} className={className}>
      <select
        id={id}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {opts.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </Wrap>
  )
}

export function TextAreaField({ label, value, onChange, hint, required, className, maxLength, rows = 4, ...rest }) {
  const id = useId()
  const extra = maxLength ? `${(value ?? '').length}/${maxLength}` : null
  return (
    <Wrap id={id} label={label} hint={hint} extra={extra} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint || extra ? `${id}-hint` : undefined}
        {...rest}
      />
    </Wrap>
  )
}
