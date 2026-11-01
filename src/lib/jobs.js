// Jobs: helpers shared by the Jobs page.
export const JOB_STATUSES = [
  ['new', 'New'],
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['rejected', 'Rejected'],
  ['hidden', 'Hidden'],
]

export const MIN_JOB_TEXT = 40
export const MAX_JOB_TEXT = 15000

// 'good' = at or above the user's bar, 'low' = below it, 'unscored' = no score yet
export function scoreBand(score, bar = 70) {
  if (score === null || score === undefined || score === '') return 'unscored'
  return Number(score) >= bar ? 'good' : 'low'
}

export function checkJobForm({ text, url }) {
  const errors = {}
  const t = (text || '').trim()
  if (t.length < MIN_JOB_TEXT) errors.text = 'Paste the full job description (at least a few lines).'
  else if (t.length > MAX_JOB_TEXT) errors.text = `That is too long. The limit is ${MAX_JOB_TEXT.toLocaleString()} characters.`
  const u = (url || '').trim()
  if (u) {
    try {
      const x = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`)
      if (!x.hostname.includes('.')) throw new Error('x')
    } catch {
      errors.url = 'That does not look like a web address.'
    }
  }
  return errors
}

export const normJobUrl = (u) => {
  const x = (u || '').trim()
  if (!x) return ''
  return /^https?:\/\//i.test(x) ? x : `https://${x}`
}

// jobs filtered and sorted for the list
export function filterJobs(jobs, tab, bar = 70) {
  const list = jobs.filter((j) => {
    if (tab === 'hidden') return j.status === 'hidden'
    if (j.status === 'hidden') return false
    if (tab === 'good') return scoreBand(j.match_score, bar) === 'good'
    if (tab === 'low') return scoreBand(j.match_score, bar) !== 'good'
    return true
  })
  return list.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1) || String(b.created_at).localeCompare(String(a.created_at)))
}

async function friendlyJobError(error) {
  let body = null
  try {
    body = await error?.context?.json?.()
  } catch {
    /* no body */
  }
  if (body?.message) return body.message
  if (/Failed to send|NetworkError|fetch/i.test(error?.message || '')) return 'Could not reach the job service. Check your internet, or the function may not be deployed yet.'
  if (error?.context?.status === 404) return 'The job matching function is not deployed yet. Deploy rapidly-job-match in Supabase first.'
  return 'Scoring failed. Please try again in a minute.'
}

// body: {text, url?, title?, company?}  or  {job_id}
export async function scoreJob(supabase, body) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000))
  let res
  try {
    res = await Promise.race([supabase.functions.invoke('rapidly-job-match', { body }), timeout])
  } catch (e) {
    throw new Error(e.message === 'timeout' ? 'Scoring took too long. Please try again.' : await friendlyJobError(e))
  }
  if (res.error) throw new Error(await friendlyJobError(res.error))
  if (!res.data?.ok) throw new Error(res.data?.message || 'Scoring failed. Please try again.')
  return res.data.job
}
