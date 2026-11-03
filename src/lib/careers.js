// Company career pages: helpers for the Companies page.
export const ATS_LABEL = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' }

// Companies to try with one tap. Not every company keeps a public board, so each is checked when you press Find roles.
export const STARTERS = [
  { name: 'Razorpay', ats: 'greenhouse', board: 'razorpay' },
  { name: 'Postman', ats: 'greenhouse', board: 'postman' },
  { name: 'Stripe', ats: 'greenhouse', board: 'stripe' },
  { name: 'Databricks', ats: 'greenhouse', board: 'databricks' },
  { name: 'Cloudflare', ats: 'greenhouse', board: 'cloudflare' },
  { name: 'Anthropic', ats: 'greenhouse', board: 'anthropic' },
  { name: 'CRED', ats: 'lever', board: 'cred' },
  { name: 'Notion', ats: 'ashby', board: 'notion' },
  { name: 'OpenAI', ats: 'ashby', board: 'openai' },
]

const BOARD_RE = /^[a-z0-9][a-z0-9_-]{0,60}$/
const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Reads a pasted careers link and works out which job-board system it is.
// Returns { ok:true, ats, board, name } or { ok:false, message }.
export function parseCompanyInput(input) {
  const raw = String(input || '').trim()
  if (!raw) return { ok: false, message: 'Paste a company careers link first.' }
  let u
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { ok: false, message: 'That does not look like a web address.' }
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  const first = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || ''
  let ats = null
  if (/(^|\.)greenhouse\.io$/.test(host)) ats = 'greenhouse'
  else if (/(^|\.)lever\.co$/.test(host)) ats = 'lever'
  else if (/(^|\.)ashbyhq\.com$/.test(host)) ats = 'ashby'
  if (!ats) {
    return {
      ok: false,
      message: 'I cannot read that page type yet. Open the company careers page and click any job. If the address then starts with boards.greenhouse.io, jobs.lever.co or jobs.ashbyhq.com, paste that address here.',
    }
  }
  // job-boards.greenhouse.io/embed/job_board?for=razorpay
  const board = (ats === 'greenhouse' && first === 'embed' ? u.searchParams.get('for') || '' : first).toLowerCase()
  if (!BOARD_RE.test(board)) return { ok: false, message: 'I could not find the company name in that link. Paste the link of the company job list.' }
  return { ok: true, ats, board, name: titleCase(board) }
}

export const isDuplicate = (list, c) => list.some((x) => x.ats === c.ats && x.board === c.board)

// which found roles are worth scoring: not already saved, best fit first, capped
export function pickToScore(candidates, savedUrls, max = 10) {
  const seen = new Set(savedUrls)
  return candidates.filter((c) => !seen.has(c.url)).slice(0, max)
}

export function agoText(iso, now = Date.now()) {
  if (!iso) return 'never'
  const mins = Math.round((now - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} d ago`
}

async function friendly(error) {
  let body = null
  try {
    body = await error?.context?.json?.()
  } catch {
    /* no body */
  }
  if (body?.message) return body.message
  if (/Failed to send|NetworkError|fetch/i.test(error?.message || '')) return 'Could not reach the company page service. Check your internet, or the function may not be deployed yet.'
  if (error?.context?.status === 404) return 'The company page function is not deployed yet. Deploy rapidly-career-fetch in Supabase first.'
  return 'Could not check that company. Please try again in a minute.'
}

export async function findRoles(supabase, { ats, board }) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000))
  let res
  try {
    res = await Promise.race([supabase.functions.invoke('rapidly-career-fetch', { body: { ats, board } }), timeout])
  } catch (e) {
    throw new Error(e.message === 'timeout' ? 'That took too long. Please try again.' : await friendly(e))
  }
  if (res.error) throw new Error(await friendly(res.error))
  if (!res.data?.ok) throw new Error(res.data?.message || 'Could not check that company.')
  return res.data
}
