import { EDU_LEVELS, SCORE_TYPES, emptyEducation } from '../lib/profileSchema'
import { TextField, SelectField } from './Field'
import MonthInput from './MonthInput'

const SCHOOL = new Set(['10th (SSC)', '12th (HSC)'])
const WITH_BACKLOGS = new Set(['Diploma', "Bachelor's degree", "Master's degree"])

export default function EducationEditor({ value, onChange }) {
  const update = (id, patch) => onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id) => onChange(value.filter((e) => e.id !== id))
  const add = () => {
    const used = new Set(value.map((e) => e.level))
    onChange([...value, emptyEducation(EDU_LEVELS.find((l) => !used.has(l)) || 'Other')])
  }

  return (
    <div>
      {value.length === 0 && (
        <p className="note">Add your 10th, 12th, diploma and degrees. Job forms often ask for each one.</p>
      )}

      {value.map((e, i) => {
        const school = SCHOOL.has(e.level)
        const st = SCORE_TYPES.find((x) => x.id === e.score_type) || SCORE_TYPES[0]
        return (
          <div className="rcard" key={e.id} role="group" aria-label={`Education ${i + 1}`}>
            <div className="rhead">
              <h4>
                Education {i + 1}
                {e.level ? ` · ${e.level}` : ''}
              </h4>
              <button type="button" className="btn small danger" onClick={() => remove(e.id)} aria-label={`Remove education ${i + 1}`}>
                Remove
              </button>
            </div>
            <div className="fgrid">
              <SelectField
                label="Level"
                required
                value={e.level}
                onChange={(v) => update(e.id, { level: v })}
                options={EDU_LEVELS}
              />
              <TextField
                label={school ? 'School' : 'College / institute'}
                required
                value={e.institution}
                onChange={(v) => update(e.id, { institution: v })}
                maxLength={150}
              />
              <TextField
                label={school ? 'Board' : 'University / board'}
                value={e.board_university}
                onChange={(v) => update(e.id, { board_university: v })}
                maxLength={150}
              />
              <TextField
                label={school ? 'Stream (optional)' : 'Branch / specialization'}
                value={e.field}
                onChange={(v) => update(e.id, { field: v })}
                placeholder={school ? 'e.g. Science, Commerce' : 'e.g. Computer Engineering'}
                maxLength={100}
              />
              <MonthInput label="Start date" value={e.start} onChange={(v) => update(e.id, { start: v })} />
              <MonthInput label="End date (or expected)" value={e.end} onChange={(v) => update(e.id, { end: v })} />
              <SelectField
                label="Score type"
                allowEmpty={false}
                value={e.score_type}
                onChange={(v) => update(e.id, { score_type: v, score: '' })}
                options={SCORE_TYPES.map((x) => ({ v: x.id, l: x.label }))}
              />
              <TextField
                label="Score"
                value={e.score}
                onChange={(v) => update(e.id, { score: v })}
                type={st.max ? 'number' : 'text'}
                step={st.max ? '0.01' : undefined}
                min={st.max ? 0 : undefined}
                max={st.max || undefined}
                inputMode={st.max ? 'decimal' : undefined}
                maxLength={30}
              />
              {WITH_BACKLOGS.has(e.level) && (
                <TextField
                  label="Active backlogs (optional)"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={e.backlogs}
                  onChange={(v) => update(e.id, { backlogs: v })}
                />
              )}
            </div>
          </div>
        )
      })}

      <button type="button" className="btn" onClick={add}>
        + Add education
      </button>
    </div>
  )
}
