import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BUCKET = 'rapidly-resumes'
const MAX_BYTES = 5 * 1024 * 1024
const MAX_FILES = 5
const TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
const ext = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

// quick check that the file really is what its name says (first bytes of the file)
async function looksRight(file, e) {
  const b = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  if (e === 'pdf') return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 // %PDF
  if (e === 'docx') return b[0] === 0x50 && b[1] === 0x4b // PK (zip)
  if (e === 'doc') return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0
  return false
}

export default function ResumeManager({ onCount, onAutofill, autofillBusy = false }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('rapidly_resumes').select('*').order('created_at', { ascending: false })
    if (error) setMsg({ type: 'error', text: 'Could not load your resumes. Please refresh the page.' })
    else {
      setItems(data)
      onCount?.(data.length)
    }
    setLoading(false)
  }, [onCount])

  useEffect(() => {
    load()
  }, [load])

  async function upload(file) {
    setMsg(null)
    if (!file) return
    const e = ext(file.name)
    if (!TYPES[e]) return setMsg({ type: 'error', text: 'Only PDF, DOC or DOCX files are allowed.' })
    if (file.size === 0) return setMsg({ type: 'error', text: 'That file is empty.' })
    if (file.size > MAX_BYTES) return setMsg({ type: 'error', text: 'That file is larger than 5 MB.' })
    if (items.length >= MAX_FILES) {
      return setMsg({ type: 'error', text: `You can keep up to ${MAX_FILES} resumes. Delete one first.` })
    }
    if (!(await looksRight(file, e))) {
      return setMsg({ type: 'error', text: 'That file does not look like a real ' + e.toUpperCase() + ' file.' })
    }

    setBusy('upload')
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)
    const path = `${user.id}/${Date.now()}_${safe}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: TYPES[e], upsert: false })
    if (upErr) {
      setBusy('')
      return setMsg({ type: 'error', text: 'Upload failed. Check your internet and try again.' })
    }
    const { error: dbErr } = await supabase
      .from('rapidly_resumes')
      .insert({ user_id: user.id, name: file.name, file_path: path, is_base: items.length === 0 })
    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([path]) // do not leave an orphan file behind
      setBusy('')
      return setMsg({ type: 'error', text: 'Could not save the resume. You may have reached the limit of 5.' })
    }
    await load()
    setBusy('')
    setMsg({
      type: 'ok',
      text:
        e === 'doc'
          ? `Uploaded ${file.name}. Autofill reads PDF and DOCX only, so fill your details by hand or upload a PDF.`
          : `Uploaded ${file.name}. Now press "Fill my profile" below to save yourself the typing.`,
    })
  }

  async function view(item) {
    setMsg(null)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.file_path, 60)
    if (error || !data?.signedUrl) return setMsg({ type: 'error', text: 'Could not open that file.' })
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function makeMain(item) {
    setBusy(item.id)
    setMsg(null)
    const a = await supabase.from('rapidly_resumes').update({ is_base: false }).eq('user_id', user.id)
    const b = a.error ? a : await supabase.from('rapidly_resumes').update({ is_base: true }).eq('id', item.id)
    if (b.error) setMsg({ type: 'error', text: 'Could not change the main resume.' })
    await load()
    setBusy('')
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    setBusy(item.id)
    setMsg(null)
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([item.file_path])
    if (stErr) {
      setBusy('')
      return setMsg({ type: 'error', text: 'Could not delete the file. Please try again.' })
    }
    const { error: dbErr } = await supabase.from('rapidly_resumes').delete().eq('id', item.id)
    if (dbErr) {
      setBusy('')
      return setMsg({ type: 'error', text: 'Could not delete the entry. Please try again.' })
    }
    // if the main one was deleted, make the newest remaining one main
    const rest = items.filter((x) => x.id !== item.id)
    if (item.is_base && rest.length) {
      await supabase.from('rapidly_resumes').update({ is_base: true }).eq('id', rest[0].id)
    }
    await load()
    setBusy('')
    setMsg({ type: 'ok', text: 'Resume deleted.' })
  }

  return (
    <div>
      <p className="note">
        Your resumes are stored privately. Only you can open them, and you can delete them any time. PDF, DOC or DOCX, up
        to 5 MB each, up to {MAX_FILES} files. Uploads save instantly.
      </p>

      <div
        className={`drop${drag ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          upload(e.dataTransfer.files?.[0])
        }}
      >
        <p>Drag a resume here, or</p>
        <button type="button" className="btn primary" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>
          {busy === 'upload' ? 'Uploading…' : 'Choose a file'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          aria-label="Upload resume file"
          onChange={(e) => {
            upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div aria-live="polite">
        {msg && (
          <div className={`msg ${msg.type === 'ok' ? 'ok' : 'error'}`} role={msg.type === 'ok' ? 'status' : 'alert'}>
            {msg.text}
          </div>
        )}
      </div>

      {onAutofill && items.length > 0 && (
        <p className="note">
          <strong>Fill my profile</strong> sends that resume to Google's Gemini AI, which reads it and suggests your details.
          You review every item before anything is added, and nothing is saved until you press Save changes. Works best with
          PDF or DOCX.
        </p>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No resumes yet. Upload your current one to start.</p>
      ) : (
        <ul className="rlist">
          {items.map((it) => (
            <li key={it.id}>
              <div className="rname">
                <strong>{it.name}</strong>
                <span className="muted small">
                  Added {new Date(it.created_at).toLocaleDateString()}
                  {it.is_base && <span className="badge">Main resume</span>}
                </span>
              </div>
              <div className="row wrap">
                {onAutofill && (
                  <button
                    type="button"
                    className={`btn small${it.is_base ? ' primary' : ''}`}
                    onClick={() => onAutofill(it)}
                    disabled={autofillBusy || busy === it.id || ext(it.name) === 'doc'}
                    title={ext(it.name) === 'doc' ? 'Autofill reads PDF and DOCX files. Convert this one to PDF to use it.' : undefined}
                  >
                    Fill my profile
                  </button>
                )}
                <button type="button" className="btn small" onClick={() => view(it)} disabled={busy === it.id}>
                  View
                </button>
                {!it.is_base && (
                  <button type="button" className="btn small" onClick={() => makeMain(it)} disabled={busy === it.id}>
                    Set as main
                  </button>
                )}
                <button type="button" className="btn small danger" onClick={() => remove(it)} disabled={busy === it.id}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
