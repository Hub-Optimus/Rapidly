import { emptyProject } from '../lib/profileSchema'
import { TextField, TextAreaField } from './Field'
import MonthInput from './MonthInput'

export default function ProjectsEditor({ value, onChange }) {
  const update = (id, patch) => onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id) => onChange(value.filter((e) => e.id !== id))

  return (
    <div>
      {value.length === 0 && (
        <p className="note">
          Projects you built or led. They help Rapidly pick the right ones for each job. Tip: Fill my profile on the Resume
          tab adds them for you.
        </p>
      )}
      {value.map((e, i) => (
        <div className="rcard" key={e.id} role="group" aria-label={`Project ${i + 1}`}>
          <div className="rhead">
            <h4>
              Project {i + 1}
              {e.name ? ` · ${e.name}` : ''}
            </h4>
            <button type="button" className="btn small danger" onClick={() => remove(e.id)} aria-label={`Remove project ${i + 1}`}>
              Remove
            </button>
          </div>
          <div className="fgrid">
            <TextField label="Project name" name={`proj.${e.id}.name`} required value={e.name} onChange={(v) => update(e.id, { name: v })} maxLength={120} />
            <TextField label="Your role (optional)" value={e.role} onChange={(v) => update(e.id, { role: v })} maxLength={100} placeholder="e.g. Co-founder, Product" />
            <MonthInput label="Start (optional)" name={`proj.${e.id}.start`} value={e.start} onChange={(v) => update(e.id, { start: v })} />
            <MonthInput
              label="End"
              name={`proj.${e.id}.end`}
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
              I am still working on it
            </label>
            <TextAreaField
              className="span2"
              label="What it is and what you achieved (optional)"
              value={e.description}
              onChange={(v) => update(e.id, { description: v })}
              maxLength={1000}
              rows={4}
            />
            <TextField
              className="span2"
              label="Tools and technologies (optional)"
              value={e.tools}
              onChange={(v) => update(e.id, { tools: v })}
              maxLength={200}
              placeholder="e.g. Figma, Jira, React, Supabase"
            />
            <TextField label="Live link (optional)" name={`proj.${e.id}.demo_url`} type="url" inputMode="url" value={e.demo_url} onChange={(v) => update(e.id, { demo_url: v })} />
            <TextField label="Code link (optional)" name={`proj.${e.id}.repo_url`} type="url" inputMode="url" value={e.repo_url} onChange={(v) => update(e.id, { repo_url: v })} />
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => onChange([...value, emptyProject()])} disabled={value.length >= 15}>
        + Add project
      </button>
    </div>
  )
}
