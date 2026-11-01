import { useId } from 'react'
import { useIssue } from '../lib/formContext'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Month + year pickers (works the same in every browser).
// Value is "YYYY-MM". If only a year is picked the value is just "YYYY" (the page decides if that is enough).
export default function MonthInput({
  label,
  name,
  value,
  onChange,
  disabled = false,
  disabledText = '',
  required = false,
  futureYears = 6,
}) {
  const id = useId()
  const { error, need, touch } = useIssue(name)
  const [y = '', m = ''] = String(value || '').split('-')
  const thisYear = new Date().getFullYear()
  const years = []
  for (let i = thisYear + futureYears; i >= 1970; i--) years.push(i)
  const emit = (ny, nm) => onChange(ny ? (nm ? `${ny}-${nm}` : ny) : nm ? `-${nm}` : '')
  const bad = error ? 'true' : undefined
  const described = error || need ? `${id}-err` : undefined

  return (
    <div className="field">
      <span className="label" id={`${id}-l`}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      <div className="monthrow" role="group" aria-labelledby={`${id}-l`}>
        <select
          aria-label={`${label} month`}
          data-field={name}
          value={m}
          disabled={disabled}
          onChange={(e) => emit(y, e.target.value)}
          onBlur={touch}
          aria-invalid={bad}
          aria-describedby={described}
        >
          <option value="">{disabled ? disabledText : 'Month'}</option>
          {MONTHS.map((name2, i) => (
            <option key={name2} value={String(i + 1).padStart(2, '0')}>
              {name2}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} year`}
          value={y}
          disabled={disabled}
          onChange={(e) => emit(e.target.value, m)}
          onBlur={touch}
          aria-invalid={bad}
          aria-describedby={described}
        >
          <option value="">{disabled ? disabledText : 'Year'}</option>
          {years.map((yr) => (
            <option key={yr} value={String(yr)}>
              {yr}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="ferr" id={`${id}-err`}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  )
}
