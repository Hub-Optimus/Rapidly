import { useId } from 'react'
import { useIssue } from '../lib/formContext'

// Label (with a red * when required) + the input + hint + the field's own error message.
export function Wrap({ id, label, hint, extra, required, error, need, className = '', children }) {
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

const describe = (id, error, need, hint) =>
  [error || need ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined

export function TextField({ label, name, value, onChange, hint, required, className, ...rest }) {
  const id = useId()
  const { error, need, touch } = useIssue(name)
  return (
    <Wrap id={id} label={label} hint={hint} required={required} error={error} need={need} className={className}>
      <input
        id={id}
        data-field={name}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={touch}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describe(id, error, need, hint)}
        {...rest}
      />
    </Wrap>
  )
}

export function SelectField({
  label,
  name,
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
  const { error, need, touch } = useIssue(name)
  const opts = options.map((o) => (typeof o === 'object' ? o : { v: String(o), l: String(o) }))
  return (
    <Wrap id={id} label={label} hint={hint} required={required} error={error} need={need} className={className}>
      <select
        id={id}
        data-field={name}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={touch}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describe(id, error, need, hint)}
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

export function TextAreaField({ label, name, value, onChange, hint, required, className, maxLength, rows = 4, ...rest }) {
  const id = useId()
  const { error, need, touch } = useIssue(name)
  const extra = maxLength ? `${(value ?? '').length}/${maxLength}` : null
  return (
    <Wrap id={id} label={label} hint={hint} extra={extra} required={required} error={error} need={need} className={className}>
      <textarea
        id={id}
        data-field={name}
        rows={rows}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={touch}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describe(id, error, need, hint || extra ? true : false)}
        {...rest}
      />
    </Wrap>
  )
}
