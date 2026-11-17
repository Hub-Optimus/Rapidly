// Gmail connect (read-only). The browser never sees any Gmail token; the rapidly-gmail function keeps it encrypted.
async function friendly(error) {
  let body = null
  try { body = await error?.context?.json?.() } catch { /* no body */ }
  if (body?.message) return body.message
  if (error?.context?.status === 404) return 'Gmail connect is not deployed yet. Create the rapidly-gmail function in Supabase first.'
  return 'Could not reach Gmail connect. Please try again in a minute.'
}

// asks the function for the Google permission link, then sends the browser there
export async function startGmail(supabase, origin = window.location.origin) {
  const res = await supabase.functions.invoke('rapidly-gmail', { body: { action: 'start', origin } })
  if (res.error) throw new Error(await friendly(res.error))
  if (!res.data?.ok || !/^https:\/\/accounts\.google\.com\//.test(res.data.url || '')) throw new Error(res.data?.message || 'Could not start the Gmail connection.')
  return res.data.url
}

export async function disconnectGmail(supabase) {
  const res = await supabase.functions.invoke('rapidly-gmail', { body: { action: 'disconnect' } })
  if (res.error) throw new Error(await friendly(res.error))
  if (!res.data?.ok) throw new Error(res.data?.message || 'Could not disconnect.')
}

// what to tell the user when Google sends them back to the site with ?gmail=...
export const GMAIL_RESULT = {
  connected: { type: 'success', text: 'Gmail connected. Rapidly can now read job-alert emails (read-only).' },
  denied: { type: 'error', text: 'You did not allow access, so nothing was connected.' },
  mismatch: { type: 'error', text: 'That Google account is not your Application email, so it was not connected. Pick the same Gmail as your Application email.' },
  scope: { type: 'error', text: 'Rapidly needs the "read your email" permission to find job alerts. Press Connect Gmail again and keep every box ticked.' },
  error: { type: 'error', text: 'Could not connect Gmail. Please try again.' },
}
export const gmailResultFromUrl = (search) => GMAIL_RESULT[new URLSearchParams(search).get('gmail')] || null
