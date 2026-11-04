// Autopilot: daily check of company job pages. It only finds and scores roles; it never applies.
async function friendly(error) {
  let body = null
  try { body = await error?.context?.json?.() } catch { /* no body */ }
  if (body?.message) return body.message
  if (error?.context?.status === 404) return 'Autopilot is not deployed yet. Create the rapidly-autopilot function in Supabase first.'
  if (/Failed to send|NetworkError|fetch/i.test(error?.message || '')) return 'Could not reach Autopilot. Check your internet, or the function may not be deployed yet.'
  return 'Autopilot could not finish. Please try again in a minute.'
}

export async function runAutopilot(supabase) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 150000))
  let res
  try {
    res = await Promise.race([supabase.functions.invoke('rapidly-autopilot', { body: {} }), timeout])
  } catch (e) {
    throw new Error(e.message === 'timeout' ? 'That is taking long. Check the Jobs tab in a minute, results are saved as they are scored.' : await friendly(e))
  }
  if (res.error) throw new Error(await friendly(res.error))
  if (!res.data?.ok) throw new Error(res.data?.message || 'Autopilot could not finish.')
  return res.data
}

export function lastRunText(iso, now = Date.now()) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} d ago`
}
