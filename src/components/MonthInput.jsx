import { useId } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Month + year pickers (works the same in every browser). Value format: "YYYY-MM".
export default function MonthInput({
  label,
  value,
  onChange,
  disabled = false,
  disabledText = '',
  required = false,
  futureYears = 6,
}) {
  const id = useId()
  const [y = '', m = ''] = String(value || '').split('-')
  const thisYear = new Date().getFullYear()
  const years = []
  for (let i = thisYear + futureYears; i >= 1970; i--) years.push(i)
  const emit = (ny, nm) => onChange(!ny && !nm ? '' : `${ny}-${nm}`)

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
        <select aria-label={`${label} month`} value={m} disabled={disabled} onChange={(e) => emit(y, e.target.value)}>
          <option value="">{disabled ? disabledText : 'Month'}</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label={`${label} year`} value={y} disabled={disabled} onChange={(e) => emit(e.target.value, m)}>
          <option value="">{disabled ? disabledText : 'Year'}</option>
          {years.map((yr) => (
            <option key={yr} value={String(yr)}>
              {yr}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
