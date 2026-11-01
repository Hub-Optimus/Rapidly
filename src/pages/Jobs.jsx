import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { JOB_STATUSES, MAX_JOB_TEXT, checkJobForm, filterJobs, normJobUrl, scoreBand, scoreJob } from '../lib/jobs'

const MODE = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }

function JobCard({ job, bar, busy, onStatus, onRescore, onDelete }) {
  const band = scoreBand(job.match_score, bar)
  const [open, setOpen] = useState(false)
  return (
    <article className={`job ${band}`} aria-label={`${job.title} at ${job.company || 'unknown company'}`}>
      <div className="job-head">
        <div className={`score ${band}`} aria-label={band === 'unscored' ? 'Not scored' : `Match ${job.match_score} percent`}>
          {band === 'unscored' ? '–' : job.match_score}
          <small>{band === 'unscored' ? '' : '%'}</small>
        </div>
        <div className="job-main">
          <h3>{job.title}</h3>
          <p className="muted small">
            {[job.company, job.location, MODE[job.work_mode], job.salary_text].filter(Boolean).join(' · ') || 'Details not stated'}
          </p>
        </div>
      </div>
      {job.match_reason && <p className="job-reason">{job.match_reason}</p>}
      {(job.matched?.length > 0 || job.missing?.length > 0) && (
        <div className="job-tags">
          {job.matched?.map((m) => <span key={`m${m}`} className="tag ok">✓ {m}</span>)}
          {job.missing?.map((m) => <span key={`x${m}`} className="tag gap">✗ {m}</span>)}
        </div>
      )}
      {open && <pre className="job-desc">{job.description}</pre>}
      <div className="job-actions">
        <select
          aria-label="Status"
          value={job.status}
          disabled={busy}
          onChange={(e) => onStatus(job, e.target.value)}
        >
          {JOB_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {job.url && <a className="btn small" href={job.url} target="_blank" rel="noopener noreferrer">Open job ↗</a>}
        <button type="button" className="btn small" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide text' : 'Show text'}</button>
        <button type="button" className="btn small" disabled={busy} onClick={() => onRescore(job)}>Score again</button>
        <button type="button" className="btn small danger" disabled={busy} onClick={() => onDelete(job)}>Delete</button>
      </div>
    </article>
  )
}

export default function Jobs({ onBack }) {
  const { user, profile } = useAuth()
  const bar = Number(profile?.min_match_score ?? 70)
  const [jobs, setJobs] = useState(null)
  const [tab, setTab] = useState('good')
  const [form, setForm] = useState({ title: '', company: '', url: '', text: '' })
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null) // {type:'error'|'ok', text}
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('rapidly_jobs').select('*').order('created_at', { ascending: false }).limit(300)
    if (error) setMsg({ type: 'error', text: 'Could not load your jobs. Please refresh.' })
    setJobs(data || [])
  }, [])
  useEffect(() => { if (user) load() }, [user, load])

  const errors = useMemo(() => checkJobForm(form), [form])
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k) => !!errors[k] && (submitted || !!touched[k])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function add(e) {
    e.preventDefault()
    setSubmitted(true)
    setMsg(null)
    if (Object.keys(errors).length) {
      document.querySelector(`[data-jf="${Object.keys(errors)[0]}"]`)?.focus()
      return
    }
    setAdding(true)
    try {
      const job = await scoreJob(supabase, { text: form.text, url: normJobUrl(form.url), title: form.title, company: form.company })
      setJobs((cur) => [job, ...(cur || []).filter((j) => j.id !== job.id)])
      setForm({ title: '', company: '', url: '', text: '' })
      setSubmitted(false)
      setTouched({})
      setShowAdd(false)
      setTab(scoreBand(job.match_score, bar) === 'good' ? 'good' : 'low')
      setMsg({ type: 'ok', text: `Scored ${job.match_score}%. ${job.match_score >= bar ? 'This is above your bar.' : `This is below your ${bar}% bar, so it is in "Below my bar".`}` })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setAdding(false)
  }

  async function changeStatus(job, status) {
    setBusyId(job.id)
    const { error } = await supabase.from('rapidly_jobs').update({ status }).eq('id', job.id)
    if (error) setMsg({ type: 'error', text: 'Could not change the status.' })
    else setJobs((cur) => cur.map((j) => (j.id === job.id ? { ...j, status } : j)))
    setBusyId(null)
  }

  async function rescore(job) {
    setBusyId(job.id)
    setMsg(null)
    try {
      const upd = await scoreJob(supabase, { job_id: job.id })
      setJobs((cur) => cur.map((j) => (j.id === upd.id ? upd : j)))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setBusyId(null)
  }

  async function remove(job) {
    if (!window.confirm('Delete this job from your list?')) return
    setBusyId(job.id)
    const { error } = await supabase.from('rapidly_jobs').delete().eq('id', job.id)
    if (error) setMsg({ type: 'error', text: 'Could not delete it.' })
    else setJobs((cur) => cur.filter((j) => j.id !== job.id))
    setBusyId(null)
  }

  const counts = useMemo(() => ({
    good: filterJobs(jobs || [], 'good', bar).length,
    low: filterJobs(jobs || [], 'low', bar).length,
    hidden: filterJobs(jobs || [], 'hidden', bar).length,
  }), [jobs, bar])
  const shown = filterJobs(jobs || [], tab, bar)
  const TABS = [['good', `Good matches (${bar}+)`, counts.good], ['low', 'Below my bar', counts.low], ['hidden', 'Hidden', counts.hidden]]

  return (
    <div className="page">
      <header className="topbar">
        <div className="row">
          <button className="btn" onClick={onBack}>← Dashboard</button>
          <h1 className="logo small">Jobs</h1>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(!showAdd)} aria-expanded={showAdd}>
          {showAdd ? 'Close' : '+ Add a job'}
        </button>
      </header>

      {msg && <div className={`notice ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>{msg.text}</div>}

      {showAdd && (
        <form className="card form add-job" onSubmit={add} noValidate>
          <h3>Add a job</h3>
          <p className="muted small">Open the job post, select all the text, copy, and paste it below. Rapidly reads it and scores it against your profile. Nothing is applied.</p>
          <div className="field">
            <label htmlFor="jf-text">Job description <span className="req" aria-hidden="true">*</span></label>
            <textarea id="jf-text" data-jf="text" value={form.text} onChange={set('text')} onBlur={() => touch('text')} rows={9}
              aria-required="true" aria-invalid={show('text')} aria-describedby={show('text') ? 'jf-text-err' : undefined}
              placeholder="Paste the full job post here" />
            {show('text') && <p className="ferr" id="jf-text-err" role="alert">{errors.text}</p>}
          </div>
          <div className="fgrid">
            <div className="field">
              <label htmlFor="jf-url">Job link (optional)</label>
              <input id="jf-url" data-jf="url" value={form.url} onChange={set('url')} onBlur={() => touch('url')}
                aria-invalid={show('url')} aria-describedby={show('url') ? 'jf-url-err' : undefined} placeholder="https://…" />
              {show('url') && <p className="ferr" id="jf-url-err" role="alert">{errors.url}</p>}
            </div>
            <div className="field">
              <label htmlFor="jf-company">Company (optional)</label>
              <input id="jf-company" value={form.company} onChange={set('company')} maxLength={200} placeholder="Read from the text if empty" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="jf-title">Job title (optional)</label>
            <input id="jf-title" value={form.title} onChange={set('title')} maxLength={200} placeholder="Read from the text if empty" />
          </div>
          <div className="row spread">
            <span className="muted small">{form.text.length.toLocaleString()} / {MAX_JOB_TEXT.toLocaleString()}</span>
            <button className="btn primary" type="submit" disabled={adding}>
              {adding ? <><span className="spinner sm" aria-hidden="true" /> Scoring…</> : 'Add and score'}
            </button>
          </div>
        </form>
      )}

      <div className="tabs" role="tablist" aria-label="Job lists">
        {TABS.map(([id, label, n]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
            {label} <span className="count">{n}</span>
          </button>
        ))}
      </div>

      {jobs === null && <p className="muted">Loading…</p>}
      {jobs && shown.length === 0 && (
        <div className="card empty">
          {jobs.length === 0 ? (
            <>
              <h3>No jobs yet</h3>
              <p className="muted">Press <strong>+ Add a job</strong> and paste a job post. Rapidly will tell you if it is worth applying.</p>
            </>
          ) : (
            <p className="muted">Nothing here. {tab === 'good' ? `No saved job is at ${bar}% or more yet.` : 'Try another list.'}</p>
          )}
        </div>
      )}
      <div className="jobs">
        {shown.map((j) => (
          <JobCard key={j.id} job={j} bar={bar} busy={busyId === j.id} onStatus={changeStatus} onRescore={rescore} onDelete={remove} />
        ))}
      </div>
    </div>
  )
}
