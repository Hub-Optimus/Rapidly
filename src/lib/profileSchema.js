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

// database row (or saved payload) -> form state (everything is a string, array or boolean)
export function toForm(p = {}) {
  return {
    full_name: s(p.full_name),
    phone: s(p.phone),
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
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const PIN_RE = /^[1-9][0-9]{5}$/

export const normUrl = (v) => {
  const x = s(v).trim()
  if (!x) return ''
  return /^https?:\/\//i.test(x) ? x : `https://${x}`
}

const urlOk = (v) => {
  try {
    const u = new URL(v)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

const isBlankEdu = (e) =>
  !(e.institution.trim() || e.board_university.trim() || e.field.trim() || e.start || e.end || e.score.trim() || e.backlogs.trim())

const isBlankExp = (e) => !(e.company.trim() || e.title.trim() || e.location.trim() || e.start || e.end || e.description.trim())

// returns { personal: [...messages], address: [...], education: [...], work: [...], prefs: [...] }
export function validate(f) {
  const e = { personal: [], address: [], education: [], work: [], prefs: [] }

  if (!f.full_name.trim()) e.personal.push('Full name is required.')
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) {
    e.personal.push('Mobile number looks wrong. Use digits, with an optional + country code.')
  }
  if (f.dob) {
    const d = new Date(f.dob)
    const latest = new Date()
    latest.setFullYear(latest.getFullYear() - 14)
    if (Number.isNaN(d.getTime()) || d > latest || d < new Date('1940-01-01')) {
      e.personal.push('Date of birth looks wrong.')
    }
  }

  const checkAddr = (label, a) => {
    if (a.country.trim().toLowerCase() === 'india' && a.pincode.trim() && !PIN_RE.test(a.pincode.trim())) {
      e.address.push(`${label}: PIN code must be 6 digits.`)
    }
  }
  checkAddr('Current address', f.current_address)
  if (!f.permanent_same_as_current) checkAddr('Permanent address', f.permanent_address)

  f.education.forEach((x, i) => {
    if (isBlankEdu(x)) return
    const n = `Education ${i + 1}`
    if (!x.level) e.education.push(`${n}: choose the level.`)
    if (!x.institution.trim()) e.education.push(`${n}: school or college name is required.`)
    if (x.start && !MONTH_RE.test(x.start)) e.education.push(`${n}: pick both month and year for the start date.`)
    if (x.end && !MONTH_RE.test(x.end)) e.education.push(`${n}: pick both month and year for the end date.`)
    if (MONTH_RE.test(x.start) && MONTH_RE.test(x.end) && x.end < x.start) {
      e.education.push(`${n}: end date is before the start date.`)
    }
    const st = SCORE_TYPES.find((t) => t.id === x.score_type) || SCORE_TYPES[0]
    if (x.score.trim() && st.max) {
      const v = Number(x.score)
      if (!Number.isFinite(v) || v < 0 || v > st.max) e.education.push(`${n}: ${st.label} must be between 0 and ${st.max}.`)
    }
    if (x.backlogs.trim() && !/^\d{1,2}$/.test(x.backlogs.trim())) e.education.push(`${n}: backlogs must be a whole number.`)
  })

  if (!f.is_fresher) {
    f.experience.forEach((x, i) => {
      if (isBlankExp(x)) return
      const n = `Job ${i + 1}`
      if (!x.title.trim()) e.work.push(`${n}: job title is required.`)
      if (!x.company.trim()) e.work.push(`${n}: company name is required.`)
      if (!MONTH_RE.test(x.start)) e.work.push(`${n}: pick both month and year for the start date.`)
      if (!x.current) {
        if (!MONTH_RE.test(x.end)) e.work.push(`${n}: pick the end date, or tick "I currently work here".`)
        else if (MONTH_RE.test(x.start) && x.end < x.start) e.work.push(`${n}: end date is before the start date.`)
      }
    })
    if (f.total_experience_years.trim()) {
      const v = Number(f.total_experience_years)
      if (!Number.isFinite(v) || v < 0 || v > 60) e.work.push('Total experience must be between 0 and 60 years.')
    }
  }
  ;[
    ['LinkedIn', f.linkedin_url],
    ['GitHub', f.github_url],
    ['Portfolio', f.portfolio_url],
  ].forEach(([name, v]) => {
    if (v.trim() && !urlOk(normUrl(v))) e.work.push(`${name} link does not look like a web address.`)
  })

  ;[
    ['Current CTC', f.current_ctc_lpa],
    ['Expected CTC', f.expected_ctc_lpa],
  ].forEach(([name, v]) => {
    if (v.trim()) {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0 || n > 1000) e.prefs.push(`${name} must be a number between 0 and 1000 (in LPA).`)
    }
  })
  if (!Number.isInteger(f.min_match_score) || f.min_match_score < 0 || f.min_match_score > 100) {
    e.prefs.push('Minimum match score must be between 0 and 100.')
  }
  return e
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

  return {
    full_name: f.full_name.trim(),
    phone: t(f.phone),
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
