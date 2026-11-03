import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ATS_LABEL, STARTERS, agoText, findRoles, isDuplicate, parseCompanyInput, pickToScore } from '../lib/careers'
import { scoreJob } from '../lib/jobs'

export default function Companies({ onBack, onOpenJobs }) {
  const { user, profile } = useAuth()
  const bar = Number(profile?.min_match_score ?? 70)
  const [list, setList] = useState(null)
  const [input, setInput] = useState('')
  const [inputErr, setInputErr] = useState('')
  const [msg, setMsg] = useState(null)
  const [busyId, setBusyId] = useState(null) // company being checked
  const [panel, setPanel] = useState(null) // { company, data, pick:Set(url), savedUrls }
  const [run, setRun] = useState(null) // { done, total, good, failed, stopped }
  const [showOthers, setShowOthers] = useState(false)
  const [showElsewhere, setShowElsewhere] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('rapidly_companies').select('*').order('created_at', { ascending: true })
    if (error) setMsg({ type: 'error', text: 'Could not load your companies. Please refresh.' })
    setList(data || [])
  }, [])
  useEffect(() => { if (user) load() }, [user, load])

  async function addCompany(c) {
    setMsg(null)
    if (isDuplicate(list || [], c)) { setMsg({ type: 'error', text: `${c.name} is already in your list.` }); return false }
    const { data, error } = await supabase.from('rapidly_companies').insert({ user_id: user.id, name: c.name, ats: c.ats, board: c.board }).select().single()
    if (error) { setMsg({ type: 'error', text: /up to 50/.test(error.message) ? 'You can watch up to 50 companies.' : 'Could not add that company.' }); return false }
    setList((cur) => [...(cur || []), data])
    return true
  }

  async function addFromInput(e) {
    e.preventDefault()
    const r = parseCompanyInput(input)
    if (!r.ok) { setInputErr(r.message); return }
    setInputErr('')
    if (await addCompany(r)) setInput('')
  }

  async function removeCompany(c) {
    if (!window.confirm(`Stop watching ${c.name}? Jobs already saved stay in your list.`)) return
    const { error } = await supabase.from('rapidly_companies').delete().eq('id', c.id)
    if (error) return setMsg({ type: 'error', text: 'Could not remove it.' })
    setList((cur) => cur.filter((x) => x.id !== c.id))
    if (panel?.company.id === c.id) setPanel(null)
  }

  async function find(c) {
    setMsg(null); setRun(null); setPanel(null); setBusyId(c.id); setShowOthers(false); setShowElsewhere(false)
    try {
      const [data, saved] = await Promise.all([
        findRoles(supabase, c),
        supabase.from('rapidly_jobs').select('url').not('url', 'is', null),
      ])
      const savedUrls = (saved.data || []).map((j) => j.url)
      const fresh = pickToScore(data.candidates, savedUrls, 10)
      setPanel({ company: c, data, savedUrls, pick: new Set(fresh.map((x) => x.url)) })
      const upd = { last_checked_at: new Date().toISOString(), last_total: data.total, last_error: null }
      await supabase.from('rapidly_companies').update(upd).eq('id', c.id)
      setList((cur) => cur.map((x) => (x.id === c.id ? { ...x, ...upd } : x)))
    } catch (err) {
      const upd = { last_checked_at: new Date().toISOString(), last_error: err.message.slice(0, 200) }
      await supabase.from('rapidly_companies').update(upd).eq('id', c.id)
      setList((cur) => cur.map((x) => (x.id === c.id ? { ...x, ...upd } : x)))
      setMsg({ type: 'error', text: `${c.name}: ${err.message}` })
    }
    setBusyId(null)
  }

  const togglePick = (url) => setPanel((p) => {
    const pick = new Set(p.pick)
    pick.has(url) ? pick.delete(url) : pick.add(url)
    return { ...p, pick }
  })

  async function scoreSelected() {
    const chosen = [...panel.data.candidates, ...(panel.data.others || [])].filter((c) => panel.pick.has(c.url))
    if (chosen.length === 0) return
    setMsg(null)
    const r = { done: 0, total: chosen.length, good: 0, failed: 0, skipped: 0, stopped: '' }
    setRun({ ...r })
    for (const c of chosen) {
      if ((c.description || '').length < 40) { r.skipped++; r.done++; setRun({ ...r }); continue }
      try {
        const job = await scoreJob(supabase, { text: c.description, url: c.url, title: c.title, company: panel.company.name, location: c.location, posted_at: c.posted_at, source: 'career' })
        if ((job.match_score ?? 0) >= bar) r.good++
        setPanel((p) => ({ ...p, savedUrls: [...p.savedUrls, c.url] }))
      } catch (err) {
        if (/a day|busy|limit|profile first/i.test(err.message)) { r.stopped = err.message; break }
        r.failed++
      }
      r.done++
      setRun({ ...r })
    }
    setRun({ ...r, finished: true })
    setPanel((p) => ({ ...p, pick: new Set() }))
  }

  const candidates = panel?.data.candidates || []
  const scoring = !!run && !run.finished && !run.stopped
  const starters = useMemo(() => STARTERS.filter((s) => !isDuplicate(list || [], s)), [list])

  return (
    <div className="page">
      <header className="topbar">
        <div className="row">
          <button className="btn" onClick={onBack}>← Jobs</button>
          <h1 className="logo small">Company pages</h1>
        </div>
      </header>

      {msg && <div className={`notice ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>{msg.text}</div>}

      <form className="card form" onSubmit={addFromInput} noValidate>
        <h3>Add a company</h3>
        <p className="muted small">Open the company's careers page, click any job, and paste the address here. Works for Greenhouse, Lever and Ashby job pages (the address starts with boards.greenhouse.io, jobs.lever.co or jobs.ashbyhq.com).</p>
        <div className="field">
          <label htmlFor="co-url">Careers link</label>
          <input id="co-url" value={input} onChange={(e) => { setInput(e.target.value); setInputErr('') }}
            aria-invalid={!!inputErr} aria-describedby={inputErr ? 'co-err' : undefined} placeholder="https://jobs.lever.co/cred" />
          {inputErr && <p className="ferr" id="co-err" role="alert">{inputErr}</p>}
        </div>
        <button className="btn primary" type="submit">Add company</button>
        {starters.length > 0 && (
          <div className="suggest">
            <span className="small muted">Or try one of these (not every company keeps a public job list, so Rapidly tells you when it cannot find one):</span>
            <div className="chips-row">
              {starters.map((s) => (
                <button key={s.board} type="button" className="chip-btn" onClick={() => addCompany(s)}>+ {s.name}</button>
              ))}
            </div>
          </div>
        )}
      </form>

      <h3 className="sect">Watching {list ? `(${list.length})` : ''}</h3>
      {list === null && <p className="muted">Loading…</p>}
      {list && list.length === 0 && <div className="card empty"><p className="muted">No companies yet. Add one above and press <strong>Find roles</strong>.</p></div>}
      <div className="jobs">
        {(list || []).map((c) => (
          <div className="card co" key={c.id}>
            <div className="row spread wrap">
              <div className="job-main">
                <h3>{c.name} <span className="tag">{ATS_LABEL[c.ats]}</span></h3>
                <p className="muted small">
                  {c.last_error ? <span className="warn-text">{c.last_error}</span>
                    : c.last_checked_at ? `Checked ${agoText(c.last_checked_at)} · ${c.last_total ?? 0} open roles` : 'Not checked yet'}
                </p>
              </div>
              <div className="row wrap">
                <button className="btn primary small" disabled={busyId === c.id || scoring} onClick={() => find(c)}>
                  {busyId === c.id ? <><span className="spinner sm" aria-hidden="true" /> Checking…</> : 'Find roles'}
                </button>
                <button className="btn small danger" disabled={busyId === c.id || scoring} onClick={() => removeCompany(c)}>Remove</button>
              </div>
            </div>

            {panel?.company.id === c.id && (
              <div className="found">
                <p className="small">
                  <strong>{panel.data.total}</strong> open roles · <strong>{panel.data.in_location}</strong> in your places · <strong>{panel.data.matched}</strong> look relevant to your target roles.
                </p>
                <p className="muted small">
                  Looked for: {panel.data.searched?.roles?.length ? panel.data.searched.roles.join(', ') : 'no target roles set'}
                  {' · '}Places: {panel.data.searched?.places?.length ? panel.data.searched.places.join(', ') : 'any'}
                </p>
                {panel.data.matched === 0 && (
                  <p className="muted small">
                    {panel.data.total === 0 ? 'This company has no open roles right now.'
                      : panel.data.in_location === 0 ? 'No roles in your preferred places. See below, or add more places in Job preferences.'
                      : 'No role titles match your target roles. See below, or add more roles in Job preferences.'}
                  </p>
                )}
                {panel.data.elsewhere_count > 0 && (
                  <div className="more">
                    <button type="button" className="linkbtn" aria-expanded={showElsewhere} onClick={() => setShowElsewhere(!showElsewhere)}>
                      {showElsewhere ? 'Hide' : 'Show'} {panel.data.elsewhere_count} role{panel.data.elsewhere_count === 1 ? '' : 's'} that match your titles but are in other places
                    </button>
                    {showElsewhere && (
                      <ul className="cands plain">
                        {panel.data.elsewhere.map((r) => (
                          <li key={r.url}>
                            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>
                            <span className="muted small"> · {r.location || 'place not stated'}</span>
                          </li>
                        ))}
                        {panel.data.elsewhere_count > panel.data.elsewhere.length && <li className="muted small">…and {panel.data.elsewhere_count - panel.data.elsewhere.length} more</li>}
                      </ul>
                    )}
                  </div>
                )}
                {candidates.length > 0 && (
                  <>
                    <p className="muted small">Tick the roles to score. Roles you already saved are not ticked. The AI reads each one (about 5 seconds each).</p>
                    <ul className="cands">
                      {candidates.map((r) => {
                        const saved = panel.savedUrls.includes(r.url)
                        return (
                          <li key={r.url}>
                            <label className={saved ? 'cand saved' : 'cand'}>
                              <input type="checkbox" disabled={saved || scoring} checked={panel.pick.has(r.url)} onChange={() => togglePick(r.url)} />
                              <span className="cand-text">
                                <span>{r.title}</span>
                                <span className="muted small">{[r.location, saved ? 'already in your Jobs list' : `${r.fit}% title match`].filter(Boolean).join(' · ')}</span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    <button className="btn primary" onClick={scoreSelected} disabled={scoring || panel.pick.size === 0}>
                      {scoring ? <><span className="spinner sm" aria-hidden="true" /> Scoring {run.done + 1} of {run.total}…</> : `Score ${panel.pick.size} selected`}
                    </button>
                  </>
                )}
                {(panel.data.others || []).length > 0 && (
                  <div className="more">
                    <button type="button" className="linkbtn" aria-expanded={showOthers} onClick={() => setShowOthers(!showOthers)}>
                      {showOthers ? 'Hide' : 'Show'} the {panel.data.others.length}{panel.data.in_location - panel.data.matched > panel.data.others.length ? ' best' : ''} other role{panel.data.others.length === 1 ? '' : 's'} in your places (titles that did not match)
                    </button>
                    {showOthers && (
                      <>
                        <p className="muted small">You can still tick any of these and score them. The AI will judge the fit.</p>
                        <ul className="cands">
                          {panel.data.others.map((r) => {
                            const saved = panel.savedUrls.includes(r.url)
                            return (
                              <li key={r.url}>
                                <label className={saved ? 'cand saved' : 'cand'}>
                                  <input type="checkbox" disabled={saved || scoring} checked={panel.pick.has(r.url)} onChange={() => togglePick(r.url)} />
                                  <span className="cand-text">
                                    <span>{r.title}</span>
                                    <span className="muted small">{[r.location, saved ? 'already in your Jobs list' : ''].filter(Boolean).join(' · ')}</span>
                                  </span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                        {candidates.length === 0 && (
                          <button className="btn primary" onClick={scoreSelected} disabled={scoring || panel.pick.size === 0}>
                            {scoring ? <><span className="spinner sm" aria-hidden="true" /> Scoring {run.done + 1} of {run.total}…</> : `Score ${panel.pick.size} selected`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                {run && (run.finished || run.stopped) && (
                  <div className={`notice ${run.stopped ? 'error' : 'ok'}`} role="status">
                    Scored {run.done - run.failed - run.skipped} of {run.total}. {run.good} {run.good === 1 ? 'is' : 'are'} at {bar}% or more.
                    {run.failed > 0 && ` ${run.failed} could not be scored.`}
                    {run.skipped > 0 && ` ${run.skipped} had no description and were skipped.`}
                    {run.stopped && ` Stopped: ${run.stopped}`}{' '}
                    <button type="button" className="linkbtn" onClick={onOpenJobs}>See my jobs</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
