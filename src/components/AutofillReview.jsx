import { useEffect, useRef, useState } from 'react'

// Shows what the AI found in the resume. The user ticks what to add. Nothing is changed until "Add selected".
export default function AutofillReview({ review, onApply, onCancel }) {
  const [groups, setGroups] = useState(review.groups)
  const first = useRef(null)
  useEffect(() => {
    first.current?.focus()
    const k = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  const all = groups.flatMap((g) => g.items)
  const selected = all.filter((x) => x.checked).length
  const toggle = (id) =>
    setGroups((gs) => gs.map((g) => ({ ...g, items: g.items.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)) })))
  const setAll = (v) => setGroups((gs) => gs.map((g) => ({ ...g, items: g.items.map((x) => ({ ...x, checked: v })) })))

  return (
    <div className="overlay" role="presentation">
      <div className="modal review" role="dialog" aria-modal="true" aria-labelledby="rv-title">
        <h2 id="rv-title">Review what Rapidly found</h2>
        <p className="note">
          Tick what you want to add. AI can misread things, so check each item. Items that would replace something you
          already typed are unticked. Nothing is saved until you press <strong>Save changes</strong> on the profile.
        </p>
        {review.skipped > 0 && (
          <p className="note">
            {review.skipped} {review.skipped === 1 ? 'item was' : 'items were'} left out because you already have{' '}
            {review.skipped === 1 ? 'it' : 'them'}.
          </p>
        )}

        <div className="row spread rv-tools">
          <span className="small muted">
            {selected} of {all.length} selected
          </span>
          <span className="row">
            <button type="button" className="btn small" onClick={() => setAll(true)}>
              Select all
            </button>
            <button type="button" className="btn small" onClick={() => setAll(false)}>
              Clear
            </button>
          </span>
        </div>

        <div className="rv-body">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="sect">{g.title}</h3>
              {g.items.map((it, idx) => (
                <label className={`rv-item${it.checked ? ' on' : ''}`} key={it.id}>
                  <input
                    ref={g === groups[0] && idx === 0 ? first : null}
                    type="checkbox"
                    checked={it.checked}
                    onChange={() => toggle(it.id)}
                  />
                  <span className="rv-text">
                    {(it.kind === 'scalar' || it.kind === 'address' || it.kind === 'list') && <span className="rv-label">{it.label}</span>}
                    <span className="rv-new">{it.show.length > 220 ? `${it.show.slice(0, 220)}…` : it.show}</span>
                    {it.status === 'conflict' && (
                      <span className="rv-cur">
                        You currently have: {it.current.length > 140 ? `${it.current.slice(0, 140)}…` : it.current}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>

        <div className="row spread rv-foot">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={selected === 0} onClick={() => onApply(groups)}>
            {selected === 0 ? 'Add selected' : `Add ${selected} selected`}
          </button>
        </div>
      </div>
    </div>
  )
}
