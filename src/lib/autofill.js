// Resume autofill: ask the server to read a resume, clean what comes back, build a review list,
// and (only after the user ticks items) merge them into the form. Nothing here saves anything.
import {
  EDU_LEVELS,
  GENDERS,
  MARITAL,
  SCORE_TYPES,
  emptyAddress,
  emptyEducation,
  emptyExperience,
  normUrl,
  urlOk,
} from './profileSchema'

// Years of work worked out from the job dates (overlaps counted once). Returns '' if it cannot tell.
export function yearsFromJobs(jobs, now = new Date()) {
  const idx = (v, month) => {
    const m = String(v || '').match(/^(\d{4})(?:-(\d{2}))?$/)
    return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : month) : null
  }
  const spans = []
  for (const j of jobs || []) {
    const a = idx(j.start, 0)
    const b = j.current ? now.getFullYear() * 12 + now.getMonth() : idx(j.end, 0)
    if (a !== null && b !== null && b > a) spans.push([a, b])
  }
  spans.sort((x, y) => x[0] - y[0])
  let total = 0
  let cur = null
  for (const [a, b] of spans) {
    if (!cur || a > cur[1]) {
      if (cur) total += cur[1] - cur[0]
      cur = [a, b]
    } else cur[1] = Math.max(cur[1], b)
  }
  if (cur) total += cur[1] - cur[0]
  return total > 0 ? String(Math.round((total / 12) * 10) / 10) : ''
}

const FUNCTION_NAME = 'rapidly-resume-parse'

// ---------- 1. clean whatever the AI sent (never trust it) ----------
const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, max) : '')
const longText = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '')
const list = (v, max, each) => {
  const out = []
  const seen = new Set()
  if (Array.isArray(v)) {
    for (const x of v) {
      const t = str(x, each)
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        out.push(t)
      }
      if (out.length >= max) break
    }
  }
  return out
}
const pick = (v, options) => {
  const t = str(v, 40).toLowerCase()
  return options.find((o) => o.toLowerCase() === t) || ''
}
const dateText = (v) => {
  const t = str(v, 10)
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(t)) return t
  if (/^\d{4}$/.test(t)) return t
  const m = t.match(/^(\d{4})-(\d{2})-\d{2}$/)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${m[2]}` : ''
}

export function sanitizeParsed(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const a = r.current_address && typeof r.current_address === 'object' ? r.current_address : {}

  let phone = str(r.phone, 25).replace(/[^\d+\s-]/g, '').trim()
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) phone = ''

  let dob = str(r.dob, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(new Date(dob).getTime())) dob = ''

  const address = { ...emptyAddress(), line1: str(a.line1, 150), line2: str(a.line2, 150), city: str(a.city, 80), state: str(a.state, 80) }
  const pin = str(a.pincode, 10)
  address.pincode = /^[1-9][0-9]{5}$/.test(pin) ? pin : ''
  address.country = str(a.country, 60) || 'India'
  const hasAddress = !!(address.line1 || address.city || address.state || address.pincode)

  const url = (v) => {
    const u = normUrl(str(v, 200))
    return u && urlOk(u) ? u : ''
  }

  const education = (Array.isArray(r.education) ? r.education : []).slice(0, 12).map((e) => {
    const st = pick(e?.score_type, SCORE_TYPES.map((x) => x.id)) || 'percentage'
    const def = SCORE_TYPES.find((x) => x.id === st)
    let score = str(e?.score, 30)
    if (def.max) {
      const n = Number(score)
      // an empty score must stay empty (Number('') is 0, which would show a fake "0")
      score = score !== '' && Number.isFinite(n) && n >= 0 && n <= def.max ? String(n) : ''
    }
    return {
      level: pick(e?.level, EDU_LEVELS) || 'Other',
      institution: str(e?.institution, 150),
      board_university: str(e?.board_university, 150),
      field: str(e?.field, 100),
      start: dateText(e?.start),
      end: dateText(e?.end),
      score_type: st,
      score,
    }
  }).filter((e) => e.institution)

  const experience = (Array.isArray(r.experience) ? r.experience : []).slice(0, 20).map((e) => ({
    company: str(e?.company, 100),
    title: str(e?.title, 100),
    location: str(e?.location, 100),
    start: dateText(e?.start),
    end: e?.current === true ? '' : dateText(e?.end),
    current: e?.current === true,
    description: longText(e?.description, 1500),
  })).filter((e) => e.company && e.title)

  const yearsText = str(r.total_experience_years, 6)
  const years = yearsText === '' ? NaN : Number(yearsText)
  return {
    full_name: str(r.full_name, 100),
    phone,
    dob,
    gender: pick(r.gender, GENDERS),
    nationality: str(r.nationality, 60),
    marital_status: pick(r.marital_status, MARITAL),
    fathers_name: str(r.fathers_name, 100),
    languages: list(r.languages, 15, 40),
    headline: str(r.headline, 120),
    summary: longText(r.summary, 1000),
    skills: list(r.skills, 50, 60),
    suggested_roles: list(r.suggested_roles, 8, 60),
    total_experience_years: Number.isFinite(years) && years >= 0 && years <= 60 ? String(years) : '',
    linkedin_url: url(r.linkedin_url),
    github_url: url(r.github_url),
    portfolio_url: url(r.portfolio_url),
    current_address: hasAddress ? address : null,
    education,
    experience,
  }
}

// ---------- 2. turn the result into a review list ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtDate = (v) => {
  if (!v) return ''
  const [y, m] = v.split('-')
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y
}
const low = (v) => String(v || '').trim().toLowerCase()
const same = (a, b) => low(a) === low(b)
const looseSame = (a, b) => !!low(a) && !!low(b) && (low(a).includes(low(b)) || low(b).includes(low(a)))

const SCALARS = [
  ['Personal details', 'full_name', 'Full name'],
  ['Personal details', 'phone', 'Mobile number'],
  ['Personal details', 'dob', 'Date of birth'],
  ['Personal details', 'gender', 'Gender'],
  ['Personal details', 'nationality', 'Nationality'],
  ['Personal details', 'marital_status', 'Marital status'],
  ['Personal details', 'fathers_name', "Father's name"],
  ['Work & skills', 'headline', 'Headline'],
  ['Work & skills', 'total_experience_years', 'Total experience (years)'],
  ['Work & skills', 'summary', 'Summary'],
  ['Work & skills', 'linkedin_url', 'LinkedIn'],
  ['Work & skills', 'github_url', 'GitHub'],
  ['Work & skills', 'portfolio_url', 'Portfolio'],
]

const addrText = (a) => [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')
const eduText = (e) =>
  [e.level, e.institution, e.field, [fmtDate(e.start), fmtDate(e.end)].filter(Boolean).join(' – '), e.score && `${e.score}${e.score_type === 'percentage' ? '%' : ''}`]
    .filter(Boolean)
    .join(' · ')
const expText = (e) =>
  `${e.title} at ${e.company}` + (e.start ? ` · ${fmtDate(e.start)} – ${e.current ? 'Present' : fmtDate(e.end) || '?'}` : '')

export function buildReview(form, parsed) {
  const items = []
  let skipped = 0
  const add = (it) => items.push({ checked: it.status === 'new', ...it })

  for (const [group, key, label] of SCALARS) {
    const v = parsed[key]
    if (!v || same(v, form[key])) continue
    add({
      id: key, group, kind: 'scalar', key, label, value: v, show: v,
      current: form[key] ? String(form[key]) : '', status: form[key] ? 'conflict' : 'new',
    })
  }

  // the resume often says "4+ years" only in words, so work it out from the jobs
  if (!parsed.total_experience_years && !form.total_experience_years && !form.is_fresher) {
    const y = yearsFromJobs(parsed.experience)
    if (y) {
      add({
        id: 'total_experience_years', group: 'Work & skills', kind: 'scalar', key: 'total_experience_years',
        label: 'Total experience (years, worked out from your job dates)', value: y, show: `${y} years`, current: '', status: 'new',
      })
    }
  }

  if (parsed.current_address) {
    const cur = form.current_address
    const merged = { ...cur }
    for (const k of ['line1', 'line2', 'city', 'state', 'pincode']) if (parsed.current_address[k]) merged[k] = parsed.current_address[k]
    if (addrText(merged) !== addrText(cur)) {
      add({
        id: 'current_address', group: 'Address', kind: 'address', key: 'current_address', label: 'Current address',
        value: parsed.current_address, show: addrText(parsed.current_address),
        current: addrText(cur), status: addrText(cur) ? 'conflict' : 'new',
      })
    }
  }

  for (const [group, key, label] of [
    ['Work & skills', 'skills', 'Skills to add'],
    ['Personal details', 'languages', 'Languages to add'],
  ]) {
    const fresh = parsed[key].filter((x) => !form[key].some((y) => same(x, y)))
    if (fresh.length) add({ id: key, group, kind: 'list', key, label, value: fresh, show: fresh.join(', '), current: '', status: 'new' })
  }

  parsed.education.forEach((e, i) => {
    const dup = form.education.some((x) => same(x.level, e.level) && looseSame(x.institution, e.institution))
    if (dup) return void skipped++
    add({ id: `edu${i}`, group: 'Education', kind: 'edu', label: e.level, value: e, show: eduText(e), current: '', status: 'new' })
  })

  parsed.experience.forEach((e, i) => {
    const dup = form.experience.some((x) => looseSame(x.company, e.company) && looseSame(x.title, e.title))
    if (dup) return void skipped++
    add({ id: `exp${i}`, group: 'Work experience', kind: 'exp', label: 'Job', value: e, show: expText(e), current: '', status: 'new' })
  })

  const order = ['Personal details', 'Address', 'Education', 'Work experience', 'Work & skills']
  const groups = order
    .map((g) => ({ title: g, items: items.filter((x) => x.group === g) }))
    .filter((g) => g.items.length)
  return { groups, count: items.length, skipped }
}

// ---------- 3. merge the ticked items into the form ----------
export function applyReview(form, groups) {
  let next = { ...form }
  let filled = 0
  const eduIdx = (l) => {
    const i = EDU_LEVELS.indexOf(l)
    return i < 0 ? 99 : i
  }
  for (const it of groups.flatMap((g) => g.items)) {
    if (!it.checked) continue
    filled++
    if (it.kind === 'scalar') next[it.key] = it.value
    else if (it.kind === 'address') {
      const merged = { ...next.current_address }
      for (const k of ['line1', 'line2', 'city', 'state', 'pincode']) if (it.value[k]) merged[k] = it.value[k]
      if (!merged.country) merged.country = it.value.country || 'India'
      next.current_address = merged
    } else if (it.kind === 'list') {
      const max = it.key === 'skills' ? 50 : 15
      next[it.key] = [...next[it.key], ...it.value].slice(0, max)
    } else if (it.kind === 'edu') {
      next.education = [...next.education.filter((x) => x.institution.trim() || x.level), { ...emptyEducation(), ...it.value }]
    } else if (it.kind === 'exp') {
      next.experience = [...next.experience, { ...emptyExperience(), ...it.value }]
      next.is_fresher = false
    }
  }
  next.education = [...next.education].sort((a, b) => eduIdx(a.level) - eduIdx(b.level))
  return { form: next, filled }
}

// ---------- 4. call the server ----------
export async function friendlyAutofillError(error) {
  let body = null
  try {
    body = await error?.context?.json?.()
  } catch {
    /* no body */
  }
  if (body?.message) return body.message
  if (/Failed to send|NetworkError|fetch/i.test(error?.message || '')) {
    return 'Could not reach the autofill service. Check your internet, or the function may not be deployed yet.'
  }
  if (error?.context?.status === 404) return 'The autofill function is not deployed yet. Deploy rapidly-resume-parse in Supabase first.'
  return 'Autofill failed. Please try again in a minute, or fill the form by hand.'
}

export async function runAutofill(supabase, resumeId) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 125000))
  let res
  try {
    res = await Promise.race([supabase.functions.invoke(FUNCTION_NAME, { body: { resume_id: resumeId } }), timeout])
  } catch (e) {
    throw new Error(e.message === 'timeout' ? 'Reading the resume took too long. Please try again.' : await friendlyAutofillError(e))
  }
  if (res.error) throw new Error(await friendlyAutofillError(res.error))
  if (!res.data?.ok) throw new Error(res.data?.message || 'Autofill failed. Please try again.')
  return sanitizeParsed(res.data.data)
}
