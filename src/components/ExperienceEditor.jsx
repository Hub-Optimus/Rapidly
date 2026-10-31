import { emptyExperience } from '../lib/profileSchema'
import { TextField, TextAreaField } from './Field'
import MonthInput from './MonthInput'

export default function ExperienceEditor({ value, onChange }) {
  const update = (id, patch) => onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id) => onChange(value.filter((e) => e.id !== id))

  return (
    <div>
      {value.length === 0 && <p className="note">Add your jobs, most recent first. Internships count too.</p>}

      {value.map((e, i) => (
        <div className="rcard" key={e.id} role="group" aria-label={`Job ${i + 1}`}>
          <div className="rhead">
            <h4>
              Job {i + 1}
              {e.company ? ` · ${e.company}` : ''}
            </h4>
            <button type="button" className="btn small danger" onClick={() => remove(e.id)} aria-label={`Remove job ${i + 1}`}>
              Remove
            </button>
          </div>
          <div className="fgrid">
            <TextField
              label="Job title"
              required
              value={e.title}
              onChange={(v) => update(e.id, { title: v })}
              maxLength={100}
            />
            <TextField
              label="Company"
              required
              value={e.company}
              onChange={(v) => update(e.id, { company: v })}
              maxLength={100}
            />
            <TextField
              className="span2"
              label="Location (optional)"
              value={e.location}
              onChange={(v) => update(e.id, { location: v })}
              maxLength={100}
            />
            <MonthInput label="Start date" required value={e.start} onChange={(v) => update(e.id, { start: v })} />
            <MonthInput
              label="End date"
              required={!e.current}
              value={e.end}
              disabled={e.current}
              disabledText="Present"
              futureYears={0}
              onChange={(v) => update(e.id, { end: v })}
            />
            <label className="check span2">
              <input
                type="checkbox"
                checked={e.current}
                onChange={(ev) => update(e.id, { current: ev.target.checked, end: ev.target.checked ? '' : e.end })}
              />
              I currently work here
            </label>
            <TextAreaField
              className="span2"
              label="What you did (optional)"
              value={e.description}
              onChange={(v) => update(e.id, { description: v })}
              maxLength={1500}
              rows={4}
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn" onClick={() => onChange([...value, emptyExperience()])}>
        + Add job
      </button>
    </div>
  )
}
