// Shared helpers for the profile form: defaults, conversion, validation, completeness.
// Form field names are the same as the database column names.

export const EDU_LEVELS = [
  '10th (SSC)',
  '12th (HSC)',
  'Diploma',
  "Bachelor's degree",
  "Master's degree",
  'PhD',
  'Other',
]

export const SCORE_TYPES = [
  { id: 'percentage', label: 'Percentage', max: 100 },
  { id: 'cgpa10', label: 'CGPA (out of 10)', max: 10 },
  { id: 'cgpa4', label: 'CGPA (out of 4)', max: 4 },
  { id: 'grade', label: 'Grade / Class', max: null },
]

export const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '60 days', '90 days', 'More than 90 days']
export const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
export const MARITAL = ['Single', 'Married', 'Other', 'Prefer not to say']
export const RELOCATE = [
  { v: 'yes', l: 'Yes' },
  { v: 'no', l: 'No' },
  { v: 'maybe', l: 'Open to discuss' },
]
export const REMOTE = [
  { v: 'any', l: 'Any' },
  { v: 'onsite', l: 'On-site' },
  { v: 'hybrid', l: 'Hybrid' },
  { v: 'remote', l: 'Remote' },
]
export const DAILY_LIMITS = [5, 10, 15, 20, 25, 30, 40]

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const emptyAddress = () => ({
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
})

export const emptyEducation = (level = '') => ({
  id: uid(),
  level,
  institution: '',
  board_university: '',
  field: '',
  start: '',
  end: '',
  score_type: 'percentage',
  score: '',
  backlogs: '',
})

export const emptyExperience = () => ({
  id: uid(),
  company: '',
  title: '',
  location: '',
  start: '',
  end: '',
  current: false,
  description: '',
})

export const emptyProject = () => ({
  id: uid(),
  name: '',
  role: '',
  start: '',
  end: '',
  current: false,
  description: '',
  tools: '',
  demo_url: '',
  repo_url: '',
})

export const emptyAward = () => ({ id: uid(), title: '', issuer: '', date: '' })

const s = (v) => (v == null ? '' : String(v))
const arr = (v) => (Array.isArray(v) ? v.map(String) : [])

const addrFrom = (a) => {
  const x = a && typeof a === 'object' ? a : {}
  return {
    line1: s(x.line1),
    line2: s(x.line2),
    city: s(x.city),
    state: s(x.state),
    pincode: s(x.pincode),
    country: s(x.country) || 'India',
  }
}

const eduFrom = (e) => ({
  id: (e && e.id) || uid(),
  level: s(e?.level),
  institution: s(e?.institution),
  board_university: s(e?.board_university),
  field: s(e?.field),
  start: s(e?.start),
  end: s(e?.end),
  score_type: s(e?.score_type) || 'percentage',
  score: s(e?.score),
  backlogs: s(e?.backlogs),
})

const expFrom = (e) => ({
  id: (e && e.id) || uid(),
  company: s(e?.company),
  title: s(e?.title),
  location: s(e?.location),
  start: s(e?.start),
  end: s(e?.end),
  current: !!e?.current,
  description: s(e?.description),
})

const projFrom = (e) => ({
  id: (e && e.id) || uid(),
  name: s(e?.name),
  role: s(e?.role),
  start: s(e?.start),
  end: s(e?.end),
  current: !!e?.current,
  description: s(e?.description),
  tools: s(e?.tools),
  demo_url: s(e?.demo_url),
  repo_url: s(e?.repo_url),
})

const awardFrom = (e) => ({
  id: (e && e.id) || uid(),
  title: s(e?.title),
  issuer: s(e?.issuer),
  date: s(e?.date),
})

// database row (or saved payload) -> form state (everything is a string, array or boolean)
export function toForm(p = {}) {
  return {
    full_name: s(p.full_name),
    phone: s(p.phone),
    application_email: s(p.application_email),
    dob: s(p.dob),
    gender: s(p.gender),
    nationality: s(p.nationality),
    marital_status: s(p.marital_status),
    fathers_name: s(p.fathers_name),
    languages: arr(p.languages),
    headline: s(p.headline),
    summary: s(p.summary),
    skills: arr(p.skills),
    is_fresher: !!p.is_fresher,
    career_gap_note: s(p.career_gap_note),
    current_address: addrFrom(p.current_address),
    permanent_same_as_current: p.permanent_same_as_current !== false,
    permanent_address: addrFrom(p.permanent_address),
    education: Array.isArray(p.education) ? p.education.map(eduFrom) : [],
    experience: Array.isArray(p.experience) ? p.experience.map(expFrom) : [],
    projects: Array.isArray(p.projects) ? p.projects.map(projFrom) : [],
    awards: Array.isArray(p.awards) ? p.awards.map(awardFrom) : [],
    linkedin_url: s(p.linkedin_url),
    github_url: s(p.github_url),
    portfolio_url: s(p.portfolio_url),
    target_roles: arr(p.target_roles),
    target_locations: arr(p.target_locations),
    notice_period: s(p.notice_period),
    current_ctc_lpa: s(p.current_ctc_lpa),
    expected_ctc_lpa: s(p.expected_ctc_lpa),
    total_experience_years: s(p.total_experience_years),
    work_authorization: s(p.work_authorization),
    willing_to_relocate: s(p.willing_to_relocate),
    remote_preference: s(p.remote_preference) || 'any',
    min_match_score: Number(p.min_match_score ?? 70),
    daily_apply_limit: Number(p.daily_apply_limit ?? 30),
  }
}

// ---------- validation ----------
// checkForm() returns two maps keyed by field name:
//   errors: something is wrong (blocks Save)           e.g. { phone: 'Not a valid ...' }
//   needs:  a required field is still empty (does not block Save, blocks applying)
// Keys: full_name, phone, dob, current_address.city, permanent_address.pincode, edu.<id>.institution,
//       exp.<id>.title, skills, target_roles, linkedin_url, ... (see tabOfKey for the tab each belongs to)
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR_RE = /^\d{4}$/
const PIN_RE = /^[1-9][0-9]{5}$/

export const normUrl = (v) => {
  const x = s(v).trim()
  if (!x) return ''
  return /^https?:\/\//i.test(x) ? x : `https://${x}`
}

export const urlOk = (v) => {
  try {
    const u = new URL(v)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

const isBlankEdu = (e) =>
  !(e.institution.trim() || e.board_university.trim() || e.field.trim() || e.start || e.end || e.score.trim() || e.backlogs.trim())

const isBlankProj = (e) => !(e.name.trim() || e.role.trim() || e.start || e.end || e.description.trim() || e.tools.trim() || e.demo_url.trim() || e.repo_url.trim())
const isBlankAward = (e) => !(e.title.trim() || e.issuer.trim() || e.date)
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const isBlankExp = (e) => !(e.company.trim() || e.title.trim() || e.location.trim() || e.start || e.end || e.description.trim())

// education dates may be a month ("2022-06") or just a year ("2022"): many forms only ask for the year
const eduDateOk = (v) => (MONTH_RE.test(v) || YEAR_RE.test(v)) && Number(v.slice(0, 4)) >= 1950 && Number(v.slice(0, 4)) <= new Date().getFullYear() + 8
const endBeforeStart = (start, end) =>
  MONTH_RE.test(start) && MONTH_RE.test(end) ? end < start : Number(end.slice(0, 4)) < Number(start.slice(0, 4))

export function tabOfKey(key) {
  if (key.startsWith('current_address') || key.startsWith('permanent_address')) return 'address'
  if (key === 'education' || key.startsWith('edu.')) return 'education'
  if (key.startsWith('proj.') || key.startsWith('award.')) return 'extras'
  if (['full_name', 'phone', 'dob', 'application_email'].includes(key)) return 'personal'
  if (
    key === 'experience' ||
    key.startsWith('exp.') ||
    ['total_experience_years', 'linkedin_url', 'github_url', 'portfolio_url', 'skills', 'summary'].includes(key)
  ) {
    return 'work'
  }
  return 'prefs'
}

export function checkForm(f) {
  const errors = {}
  const needs = {}
  const err = (k, m) => {
    if (!errors[k]) errors[k] = m
  }
  const need = (k, m = 'Needed to apply') => {
    needs[k] = m
  }

  // personal
  if (!f.full_name.trim()) err('full_name', 'Enter your full name.')
  const phone = f.phone.trim()
  if (!phone) need('phone')
  else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
    err('phone', 'Not a valid mobile number. Use digits, with an optional + country code.')
  }
  const ae = f.application_email.trim()
  if (ae && (!EMAIL_RE.test(ae) || ae.length > 254)) err('application_email', 'That does not look like an email address.')
  if (f.dob) {
    const d = new Date(f.dob)
    const latest = new Date()
    latest.setFullYear(latest.getFullYear() - 14)
    if (Number.isNaN(d.getTime()) || d > latest || d < new Date('1940-01-01')) err('dob', 'Date of birth looks wrong.')
  }

  // addresses
  const checkAddr = (key, a, required) => {
    if (required) {
      if (!a.line1.trim()) need(`${key}.line1`)
      if (!a.city.trim()) need(`${key}.city`)
      if (!a.state.trim()) need(`${key}.state`)
      if (!a.pincode.trim()) need(`${key}.pincode`)
    }
    if (a.country.trim().toLowerCase() === 'india' && a.pincode.trim() && !PIN_RE.test(a.pincode.trim())) {
      err(`${key}.pincode`, 'PIN code must be 6 digits.')
    }
  }
  checkAddr('current_address', f.current_address, true)
  if (!f.permanent_same_as_current) checkAddr('permanent_address', f.permanent_address, true)

  // education
  let eduOk = 0
  f.education.forEach((x) => {
    if (isBlankEdu(x)) return
    const k = `edu.${x.id}`
    if (!x.level) err(`${k}.level`, 'Choose the level.')
    if (!x.institution.trim()) err(`${k}.institution`, 'Enter the school or college name.')
    if (x.level && x.institution.trim()) eduOk++
    if (x.start && !eduDateOk(x.start)) err(`${k}.start`, 'Pick a valid start year.')
    if (x.end && !eduDateOk(x.end)) err(`${k}.end`, 'Pick a valid end year.')
    if (x.start && x.end && eduDateOk(x.start) && eduDateOk(x.end) && endBeforeStart(x.start, x.end)) {
      err(`${k}.end`, 'End date is before the start date.')
    }
    const st = SCORE_TYPES.find((t) => t.id === x.score_type) || SCORE_TYPES[0]
    if (x.score.trim() && st.max) {
      const v = Number(x.score)
      if (!Number.isFinite(v) || v < 0 || v > st.max) err(`${k}.score`, `${st.label} must be between 0 and ${st.max}.`)
    }
    if (x.backlogs.trim() && !/^\d{1,2}$/.test(x.backlogs.trim())) err(`${k}.backlogs`, 'Enter a whole number.')
  })
  if (eduOk === 0) need('education', 'Add at least one education entry (level and school or college).')

  // work
  if (f.is_fresher) {
    // nothing to check
  } else {
    let jobs = 0
    f.experience.forEach((x) => {
      if (isBlankExp(x)) return
      const k = `exp.${x.id}`
      if (!x.title.trim()) err(`${k}.title`, 'Enter the job title.')
      if (!x.company.trim()) err(`${k}.company`, 'Enter the company name.')
      if (x.title.trim() && x.company.trim()) jobs++
      if (!x.start) err(`${k}.start`, 'Pick the start month and year.')
      else if (!MONTH_RE.test(x.start)) err(`${k}.start`, 'Pick the month as well as the year.')
      if (!x.current) {
        if (!x.end) err(`${k}.end`, 'Pick the end date, or tick "I currently work here".')
        else if (!MONTH_RE.test(x.end)) err(`${k}.end`, 'Pick the month as well as the year.')
        else if (MONTH_RE.test(x.start) && x.end < x.start) err(`${k}.end`, 'End date is before the start date.')
      }
    })
    if (jobs === 0) need('experience', 'Add a job, or tick "I am a fresher".')
    if (f.total_experience_years.trim()) {
      const v = Number(f.total_experience_years)
      if (!Number.isFinite(v) || v < 0 || v > 60) err('total_experience_years', 'Enter a number between 0 and 60.')
    }
  }
  ;[
    ['linkedin_url', f.linkedin_url],
    ['github_url', f.github_url],
    ['portfolio_url', f.portfolio_url],
  ].forEach(([k, v]) => {
    if (v.trim() && !urlOk(normUrl(v))) err(k, 'That does not look like a web address.')
  })
  // projects and awards (optional, but wrong values still block Save)
  f.projects.forEach((x) => {
    if (isBlankProj(x)) return
    const k = `proj.${x.id}`
    if (!x.name.trim()) err(`${k}.name`, 'Enter the project name.')
    if (x.start && !eduDateOk(x.start)) err(`${k}.start`, 'Pick a valid start date.')
    if (!x.current) {
      if (x.end && !eduDateOk(x.end)) err(`${k}.end`, 'Pick a valid end date.')
      if (x.start && x.end && eduDateOk(x.start) && eduDateOk(x.end) && endBeforeStart(x.start, x.end)) {
        err(`${k}.end`, 'End date is before the start date.')
      }
    }
    if (x.demo_url.trim() && !urlOk(normUrl(x.demo_url))) err(`${k}.demo_url`, 'That does not look like a web address.')
    if (x.repo_url.trim() && !urlOk(normUrl(x.repo_url))) err(`${k}.repo_url`, 'That does not look like a web address.')
  })
  f.awards.forEach((x) => {
    if (isBlankAward(x)) return
    const k = `award.${x.id}`
    if (!x.title.trim()) err(`${k}.title`, 'Enter the award or certificate name.')
    if (x.date && !eduDateOk(x.date)) err(`${k}.date`, 'Pick a valid date.')
  })
  if (f.skills.length < 1) need('skills', 'Add at least one skill.')

  // preferences
  if (f.target_roles.length < 1) need('target_roles', 'Add at least one role Rapidly should search for.')
  if (f.target_locations.length < 1) need('target_locations', 'Add at least one location (or "Remote").')
  if (!f.notice_period) need('notice_period')
  if (!f.expected_ctc_lpa.trim()) need('expected_ctc_lpa')
  if (!f.is_fresher && !f.current_ctc_lpa.trim()) need('current_ctc_lpa')
  ;[
    ['current_ctc_lpa', f.current_ctc_lpa],
    ['expected_ctc_lpa', f.expected_ctc_lpa],
  ].forEach(([k, v]) => {
    if (v.trim()) {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0 || n > 1000) err(k, 'Enter a number between 0 and 1000 (lakhs per year).')
    }
  })
  if (!Number.isInteger(f.min_match_score) || f.min_match_score < 0 || f.min_match_score > 100) {
    err('min_match_score', 'Must be between 0 and 100.')
  }
  return { errors, needs }
}

// ---------- form -> database ----------
const t = (v) => {
  const x = s(v).trim()
  return x === '' ? null : x
}
const n = (v) => {
  const x = s(v).trim()
  if (x === '') return null
  const k = Number(x)
  return Number.isFinite(k) ? k : null
}
const cleanAddr = (a) => ({
  line1: a.line1.trim(),
  line2: a.line2.trim(),
  city: a.city.trim(),
  state: a.state.trim(),
  pincode: a.pincode.trim(),
  country: a.country.trim(),
})
const cleanList = (list) => {
  const seen = new Set()
  return list
    .map((x) => x.trim())
    .filter((x) => {
      const k = x.toLowerCase()
      if (!x || seen.has(k)) return false
      seen.add(k)
      return true
    })
}

export function toPayload(f) {
  const cur = cleanAddr(f.current_address)
  const same = !!f.permanent_same_as_current
  const perm = same ? { ...cur } : cleanAddr(f.permanent_address)

  const education = f.education
    .filter((x) => !isBlankEdu(x))
    .map((x) => ({
      id: x.id,
      level: x.level,
      institution: x.institution.trim(),
      board_university: x.board_university.trim(),
      field: x.field.trim(),
      start: x.start,
      end: x.end,
      score_type: x.score_type,
      score: x.score.trim(),
      backlogs: x.backlogs.trim(),
    }))

  const experience = f.is_fresher
    ? []
    : f.experience
        .filter((x) => !isBlankExp(x))
        .map((x) => ({
          id: x.id,
          company: x.company.trim(),
          title: x.title.trim(),
          location: x.location.trim(),
          start: x.start,
          end: x.current ? '' : x.end,
          current: !!x.current,
          description: x.description.trim(),
        }))

  const projects = f.projects
    .filter((x) => !isBlankProj(x))
    .map((x) => ({
      id: x.id,
      name: x.name.trim(),
      role: x.role.trim(),
      start: x.start,
      end: x.current ? '' : x.end,
      current: !!x.current,
      description: x.description.trim(),
      tools: x.tools.trim(),
      demo_url: normUrl(x.demo_url),
      repo_url: normUrl(x.repo_url),
    }))
  const awards = f.awards
    .filter((x) => !isBlankAward(x))
    .map((x) => ({ id: x.id, title: x.title.trim(), issuer: x.issuer.trim(), date: x.date }))

  return {
    full_name: f.full_name.trim(),
    phone: t(f.phone),
    application_email: t(f.application_email.toLowerCase()),
    dob: t(f.dob),
    gender: t(f.gender),
    nationality: t(f.nationality),
    marital_status: t(f.marital_status),
    fathers_name: t(f.fathers_name),
    languages: cleanList(f.languages),
    headline: t(f.headline),
    summary: t(f.summary),
    skills: cleanList(f.skills),
    is_fresher: !!f.is_fresher,
    career_gap_note: t(f.career_gap_note),
    location: [cur.city, cur.state].filter(Boolean).join(', ') || null,
    current_address: cur,
    permanent_same_as_current: same,
    permanent_address: perm,
    education,
    experience,
    projects,
    awards,
    linkedin_url: t(normUrl(f.linkedin_url)),
    github_url: t(normUrl(f.github_url)),
    portfolio_url: t(normUrl(f.portfolio_url)),
    target_roles: cleanList(f.target_roles),
    target_locations: cleanList(f.target_locations),
    notice_period: t(f.notice_period),
    current_ctc_lpa: f.is_fresher ? null : n(f.current_ctc_lpa),
    expected_ctc_lpa: n(f.expected_ctc_lpa),
    total_experience_years: f.is_fresher ? 0 : n(f.total_experience_years),
    work_authorization: t(f.work_authorization),
    willing_to_relocate: t(f.willing_to_relocate),
    remote_preference: t(f.remote_preference),
    min_match_score: Number(f.min_match_score),
    daily_apply_limit: Number(f.daily_apply_limit),
  }
}

// ---------- completeness ----------
export function profileCompleteness(f, resumeCount = 0) {
  const ca = f.current_address
  const checks = [
    ['full name', !!f.full_name.trim()],
    ['mobile number', !!f.phone.trim()],
    ['date of birth', !!f.dob],
    ['current address', !!(ca.line1.trim() && ca.city.trim())],
    ['education', f.education.some((e) => e.level && e.institution.trim())],
    ['work experience (or tick fresher)', f.is_fresher || f.experience.some((x) => x.company.trim() && x.title.trim())],
    ['3 or more skills', f.skills.length >= 3],
    ['a short summary', f.summary.trim().length >= 30],
    ['target job roles', f.target_roles.length > 0],
    ['preferred locations', f.target_locations.length > 0],
    ['a resume', resumeCount > 0],
  ]
  const done = checks.filter((c) => c[1]).length
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c[1]).map((c) => c[0]),
  }
}
