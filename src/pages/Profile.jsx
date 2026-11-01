import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  toForm,
  toPayload,
  checkForm,
  tabOfKey,
  profileCompleteness,
  GENDERS,
  MARITAL,
  NOTICE_PERIODS,
  RELOCATE,
  REMOTE,
  DAILY_LIMITS,
} from '../lib/profileSchema'
import { TextField, SelectField, TextAreaField } from '../components/Field'
import TagInput from '../components/TagInput'
import AddressFields from '../components/AddressFields'
import EducationEditor from '../components/EducationEditor'
import ExperienceEditor from '../components/ExperienceEditor'
import ResumeManager from '../components/ResumeManager'
import AutofillReview from '../components/AutofillReview'
import { FormCtx } from '../lib/formContext'
import { runAutofill, buildReview, applyReview } from '../lib/autofill'

// Resume is first on purpose: upload it, press "Fill my profile", then just review the other tabs.
const TABS = [
  { id: 'resumes', label: 'Resume' },
  { id: 'personal', label: 'Personal' },
  { id: 'address', label: 'Address' },
  { id: 'education', label: 'Education' },
  { id: 'work', label: 'Work & skills' },
  { id: 'prefs', label: 'Job preferences' },
]
const today = () => new Date().toISOString().slice(0, 10)

export default function Profile({ onBack }) {
  const { user, profile, refreshProfile } = useAuth()

  const first = useRef(null)
  if (first.current === null) first.current = toForm(profile || {})
  const [form, setForm] = useState(first.current)
  const baseline = useRef(JSON.stringify(first.current))

  // brand-new profiles start on the Resume tab
  const [tab, setTab] = useState(first.current.education.length === 0 && first.current.skills.length === 0 ? 'resumes' : 'personal')
  const [touched, setTouched] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'ok' | 'info' | 'error', text }
  const [resumeCount, setResumeCount] = useState(0)
  const [reading, setReading] = useState(false)
  const [review, setReview] = useState(null)
  const [focusKey, setFocusKey] = useState(0)
  const focusKeys = useRef(null)

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== baseline.current
  const { errors, needs } = useMemo(() => checkForm(form), [form])
  const { percent, missing } = useMemo(() => profileCompleteness(form, resumeCount), [form, resumeCount])

  const ctx = useMemo(
    () => ({
      errors,
      needs,
      touched,
      submitted,
      touch: (k) => setTouched((t) => (t.has(k) ? t : new Set(t).add(k))),
    }),
    [errors, needs, touched, submitted],
  )
  // errors the user can already see (field visited, or Save clicked)
  const shownErrors = Object.keys(errors).filter((k) => submitted || touched.has(k))
  const needKeys = Object.keys(needs)
  const tabHas = (id, keys) => keys.some((k) => tabOfKey(k) === id)

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  // an old error message should disappear as soon as the user edits something
  useEffect(() => {
    setStatus((s) => (s?.type === 'error' ? null : s))
  }, [form])

  function goBack() {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    onBack()
  }

  function discard() {
    if (!window.confirm('Discard all unsaved changes?')) return
    setForm(JSON.parse(baseline.current))
    setTouched(new Set())
    setSubmitted(false)
    setStatus(null)
  }

  // jump to the first tab (in tab order) that has one of these problem keys, and focus its first field
  function goToFirst(keys) {
    const bad = TABS.find((t) => tabHas(t.id, keys))
    if (!bad) return
    focusKeys.current = new Set(keys)
    setTab(bad.id)
    setFocusKey((n) => n + 1)
  }
  useEffect(() => {
    if (!focusKeys.current) return
    const keys = focusKeys.current
    focusKeys.current = null
    const id = requestAnimationFrame(() => {
      const el = [...document.querySelectorAll('.form [data-field]')].find((x) => keys.has(x.getAttribute('data-field')))
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el.focus({ preventScroll: true })
      } else window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [focusKey])

  async function save() {
    setStatus(null)
    setSubmitted(true)
    const errKeys = Object.keys(errors)
    if (errKeys.length) {
      goToFirst(errKeys)
      return
    }
    setSaving(true)
    const payload = toPayload(form)
    const { error } = await supabase
      .from('rapidly_profiles')
      .update({ ...payload, profile_updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      const missingCols = error.code === 'PGRST204' || /column/i.test(error.message || '')
      setStatus({
        type: 'error',
        text: missingCols
          ? 'The database is missing the new columns. Run the 06 SQL file in Supabase first.'
          : 'Could not save. Check your internet and try again.',
      })
      return
    }
    const next = toForm(payload)
    baseline.current = JSON.stringify(next)
    setForm(next)
    setStatus({ type: 'ok', text: 'Saved' })
    refreshProfile()
  }

  // ----- resume autofill -----
  async function startAutofill(item) {
    setStatus(null)
    setReading(true)
    try {
      const parsed = await runAutofill(supabase, item.id)
      const r = buildReview(form, parsed)
      if (r.count === 0) {
        setStatus({ type: 'info', text: 'Rapidly found nothing new in that resume. Your profile already has it, or the resume was hard to read.' })
      } else setReview(r)
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    } finally {
      setReading(false)
    }
  }
  function applyAutofill(groups) {
    const { form: next, filled } = applyReview(form, groups)
    setForm(next)
    setReview(null)
    setTab('personal')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStatus({
      type: 'info',
      text: `Added ${filled} ${filled === 1 ? 'item' : 'items'} from your resume. Check each tab, then press Save changes.`,
    })
  }

  function onTabKey(e) {
    const i = TABS.findIndex((t) => t.id === tab)
    let n = null
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = TABS.length - 1
    if (n === null) return
    e.preventDefault()
    setTab(TABS[n].id)
    document.getElementById(`tab-${TABS[n].id}`)?.focus()
  }

  const nErr = shownErrors.length
  const nNeed = needKeys.length
  const savedOk = status?.type === 'ok' && !dirty

  let left
  if (saving) left = <span className="muted">Saving…</span>
  else if (nErr > 0) {
    left = (
      <span className="err-text">
        {nErr} {nErr === 1 ? 'field needs' : 'fields need'} fixing before you can save.{' '}
        <button type="button" className="linkbtn" onClick={() => goToFirst(shownErrors)}>
          Show me
        </button>
      </span>
    )
  } else if (status?.type === 'error') left = <span className="err-text">{status.text}</span>
  else if (status?.type === 'info') left = <span className="muted">{status.text}</span>
  else if (dirty) left = <span className="muted">Unsaved changes</span>
  else if (savedOk && nNeed > 0) {
    left = (
      <span className="warn-text">
        Saved. {nNeed} required {nNeed === 1 ? 'item is' : 'items are'} still empty.{' '}
        <button type="button" className="linkbtn" onClick={() => goToFirst(needKeys)}>
          Show me
        </button>
      </span>
    )
  } else if (savedOk) left = <span className="muted">All changes saved</span>
  else left = <span className="muted" />

  return (
    <FormCtx.Provider value={ctx}>
    <div className="page form">
      <div className="phead">
        <button type="button" className="btn" onClick={goBack}>
          ← Dashboard
        </button>
        <h1>Your profile</h1>
      </div>

      <div className="pmeter">
        <div className="row spread">
          <span className="small">Profile {percent}% complete</span>
          {percent < 100 && missing.length > 0 && <span className="muted small">Next: {missing.slice(0, 2).join(', ')}</span>}
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Profile completeness"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <p className="note">
        This information is used only to find jobs and fill applications for you. Optional fields are used only when a form
        asks for them. Government ID numbers, bank details and documents are not collected on this page.
      </p>

      <p className="legend">
        <span className="req">*</span> Needed before Rapidly can apply for you. You can save now and finish later.
      </p>

      <div className="tabs" role="tablist" aria-label="Profile sections" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {tabHas(t.id, shownErrors) && <span className="dot" aria-label="has errors" />}
            {!tabHas(t.id, shownErrors) && submitted && tabHas(t.id, needKeys) && <span className="dot warn" aria-label="has empty required fields" />}
          </button>
        ))}
      </div>

      <section role="tabpanel" id="panel-personal" aria-labelledby="tab-personal" hidden={tab !== 'personal'}>
        {tab === 'personal' && (
          <>
            <div className="fgrid">
              <TextField
                label="Full name"
                name="full_name"
                required
                value={form.full_name}
                onChange={set('full_name')}
                autoComplete="name"
                maxLength={100}
              />
              <TextField label="Email" value={user?.email || ''} readOnly hint="This is your login email." />
              <TextField
                label="Mobile number"
                name="phone"
                required
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+91 98765 43210"
                maxLength={20}
              />
              <TextField
                label="Date of birth"
                name="dob"
                type="date"
                value={form.dob}
                onChange={set('dob')}
                min="1940-01-01"
                max={today()}
                autoComplete="bday"
              />
              <SelectField label="Gender (optional)" value={form.gender} onChange={set('gender')} options={GENDERS} />
              <TextField
                label="Nationality (optional)"
                value={form.nationality}
                onChange={set('nationality')}
                placeholder="e.g. Indian"
                maxLength={60}
              />
              <SelectField
                label="Marital status (optional)"
                value={form.marital_status}
                onChange={set('marital_status')}
                options={MARITAL}
              />
              <TextField
                label="Father's name (optional)"
                value={form.fathers_name}
                onChange={set('fathers_name')}
                hint="Some Indian application forms ask for it."
                maxLength={100}
              />
              <TagInput
                label="Languages you speak (optional)"
                values={form.languages}
                onChange={set('languages')}
                placeholder="e.g. English, Hindi, Marathi"
                max={15}
              />
            </div>
          </>
        )}
      </section>

      <section role="tabpanel" id="panel-address" aria-labelledby="tab-address" hidden={tab !== 'address'}>
        {tab === 'address' && (
          <>
            <h3 className="sect">Current address</h3>
            <AddressFields prefix="current_address" required value={form.current_address} onChange={set('current_address')} autofill />
            <label className="check">
              <input
                type="checkbox"
                checked={form.permanent_same_as_current}
                onChange={(e) => set('permanent_same_as_current')(e.target.checked)}
              />
              My permanent address is the same as my current address
            </label>
            {!form.permanent_same_as_current && (
              <>
                <h3 className="sect">Permanent address</h3>
                <AddressFields prefix="permanent_address" value={form.permanent_address} onChange={set('permanent_address')} />
              </>
            )}
          </>
        )}
      </section>

      <section role="tabpanel" id="panel-education" aria-labelledby="tab-education" hidden={tab !== 'education'}>
        {tab === 'education' && (
          <>
            <EducationEditor value={form.education} onChange={set('education')} />
          </>
        )}
      </section>

      <section role="tabpanel" id="panel-work" aria-labelledby="tab-work" hidden={tab !== 'work'}>
        {tab === 'work' && (
          <>
            <label className="check">
              <input type="checkbox" checked={form.is_fresher} onChange={(e) => set('is_fresher')(e.target.checked)} />
              I am a fresher (no work experience yet)
            </label>
            {!form.is_fresher && <ExperienceEditor value={form.experience} onChange={set('experience')} />}

            <h3 className="sect">About you</h3>
            <div className="fgrid">
              {!form.is_fresher && (
                <TextField
                  label="Total experience (years)"
                  name="total_experience_years"
                  type="number"
                  min={0}
                  max={60}
                  step={0.5}
                  inputMode="decimal"
                  value={form.total_experience_years}
                  onChange={set('total_experience_years')}
                />
              )}
              <TextField
                className="span2"
                label="Professional headline"
                value={form.headline}
                onChange={set('headline')}
                maxLength={120}
                placeholder="e.g. Full-stack developer with 3 years in fintech"
              />
              <TextAreaField
                className="span2"
                label="Summary"
                value={form.summary}
                onChange={set('summary')}
                maxLength={1000}
                rows={5}
                hint="Two to four lines about you. It helps Rapidly tailor your resume."
              />
              <TagInput
                label="Skills"
                name="skills"
                required
                values={form.skills}
                onChange={set('skills')}
                placeholder="e.g. React, Python, SQL"
                max={50}
              />
              <TextAreaField
                className="span2"
                label="Career gap explanation (optional)"
                value={form.career_gap_note}
                onChange={set('career_gap_note')}
                maxLength={500}
                rows={3}
              />
              <TextField
                label="LinkedIn (optional)"
                name="linkedin_url"
                type="url"
                inputMode="url"
                value={form.linkedin_url}
                onChange={set('linkedin_url')}
                placeholder="linkedin.com/in/yourname"
              />
              <TextField
                label="GitHub (optional)"
                name="github_url"
                type="url"
                inputMode="url"
                value={form.github_url}
                onChange={set('github_url')}
                placeholder="github.com/yourname"
              />
              <TextField
                className="span2"
                label="Portfolio or website (optional)"
                name="portfolio_url"
                type="url"
                inputMode="url"
                value={form.portfolio_url}
                onChange={set('portfolio_url')}
              />
            </div>
          </>
        )}
      </section>

      <section role="tabpanel" id="panel-prefs" aria-labelledby="tab-prefs" hidden={tab !== 'prefs'}>
        {tab === 'prefs' && (
          <>
            <div className="fgrid">
              <TagInput
                label="Target job roles"
                name="target_roles"
                required
                values={form.target_roles}
                onChange={set('target_roles')}
                placeholder="e.g. Full-stack developer, Data analyst"
                max={15}
                hint="Rapidly searches for these titles."
              />
              <TagInput
                label="Preferred locations"
                name="target_locations"
                required
                values={form.target_locations}
                onChange={set('target_locations')}
                placeholder="e.g. Pune, Bengaluru, Remote, Japan"
                max={15}
              />
              <SelectField label="Notice period" value={form.notice_period} onChange={set('notice_period')} options={NOTICE_PERIODS} />
              <SelectField label="Work mode" allowEmpty={false} value={form.remote_preference} onChange={set('remote_preference')} options={REMOTE} />
              <SelectField label="Open to relocating?" value={form.willing_to_relocate} onChange={set('willing_to_relocate')} options={RELOCATE} />
              <span />
              {!form.is_fresher && (
                <TextField
                  label="Current CTC (LPA)"
                  name="current_ctc_lpa"
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  value={form.current_ctc_lpa}
                  onChange={set('current_ctc_lpa')}
                  hint="Lakhs per annum. Used only when a form asks."
                />
              )}
              <TextField
                label="Expected CTC (LPA)"
                name="expected_ctc_lpa"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={form.expected_ctc_lpa}
                onChange={set('expected_ctc_lpa')}
              />
              <TextField
                className="span2"
                label="Work authorization / visa status (optional)"
                value={form.work_authorization}
                onChange={set('work_authorization')}
                placeholder="e.g. Indian citizen, no sponsorship needed for India"
                maxLength={200}
              />
            </div>

            <h3 className="sect">Agent limits</h3>
            <div className="fgrid">
              <div className="field span2">
                <label htmlFor="min-score">
                  Minimum match score: <strong>{form.min_match_score}%</strong>
                </label>
                <input
                  id="min-score"
                  type="range"
                  min={40}
                  max={95}
                  step={5}
                  value={form.min_match_score}
                  onChange={(e) => set('min_match_score')(Number(e.target.value))}
                  aria-describedby="min-score-hint"
                />
                <p className="hint" id="min-score-hint">
                  Rapidly only queues jobs at or above this score. 70 or more is recommended: fewer, better applications get
                  more replies.
                </p>
              </div>
              <SelectField
                label="Maximum applications per day"
                allowEmpty={false}
                value={form.daily_apply_limit}
                onChange={(v) => set('daily_apply_limit')(Number(v))}
                options={DAILY_LIMITS.map((x) => ({ v: String(x), l: String(x) }))}
                hint="Higher numbers raise the chance of limits on job portals."
              />
            </div>
          </>
        )}
      </section>

      <section role="tabpanel" id="panel-resumes" aria-labelledby="tab-resumes" hidden={tab !== 'resumes'}>
        <ResumeManager onCount={setResumeCount} onAutofill={startAutofill} autofillBusy={reading} />
      </section>

      <div className="savebar">
        <div aria-live="polite" className="small savemsg">
          {left}
        </div>
        <div className="row">
          {dirty && (
            <button type="button" className="btn" onClick={discard} disabled={saving}>
              Discard
            </button>
          )}
          <button type="button" className="btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
    {reading && (
      <div className="overlay" role="alertdialog" aria-live="assertive" aria-label="Reading your resume">
        <div className="modal reading">
          <div className="spinner" aria-hidden="true" />
          <p>Reading your resume…</p>
          <p className="muted small">This takes about 10 to 20 seconds. Please keep this page open.</p>
        </div>
      </div>
    )}
    {review && <AutofillReview review={review} onApply={applyAutofill} onCancel={() => setReview(null)} />}
    </FormCtx.Provider>
  )
}
