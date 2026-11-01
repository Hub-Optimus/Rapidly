import { emptyAward } from '../lib/profileSchema'
import { TextField } from './Field'
import MonthInput from './MonthInput'

export default function AwardsEditor({ value, onChange }) {
  const update = (id, patch) => onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id) => onChange(value.filter((e) => e.id !== id))

  return (
    <div>
      {value.length === 0 && <p className="note">Awards, recognitions and certificates (optional).</p>}
      {value.map((e, i) => (
        <div className="rcard" key={e.id} role="group" aria-label={`Award ${i + 1}`}>
          <div className="rhead">
            <h4>
              Award or certificate {i + 1}
              {e.title ? ` · ${e.title}` : ''}
            </h4>
            <button type="button" className="btn small danger" onClick={() => remove(e.id)} aria-label={`Remove award ${i + 1}`}>
              Remove
            </button>
          </div>
          <div className="fgrid">
            <TextField className="span2" label="Name" name={`award.${e.id}.title`} required value={e.title} onChange={(v) => update(e.id, { title: v })} maxLength={150} />
            <TextField label="Given by (optional)" value={e.issuer} onChange={(v) => update(e.id, { issuer: v })} maxLength={150} />
            <MonthInput label="Date (optional)" name={`award.${e.id}.date`} futureYears={0} value={e.date} onChange={(v) => update(e.id, { date: v })} />
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => onChange([...value, emptyAward()])} disabled={value.length >= 20}>
        + Add award or certificate
      </button>
    </div>
  )
}
