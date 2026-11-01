import { createContext, useContext } from 'react'

// Shared by every input on the profile page, so each field can show its own error right under it.
//   errors:    { fieldKey: message }   something is wrong
//   needs:     { fieldKey: message }   required but still empty
//   touched:   Set of field keys the user has already visited (left)
//   submitted: true after the first Save click (then every problem is shown)
export const FormCtx = createContext({
  errors: {},
  needs: {},
  touched: new Set(),
  submitted: false,
  touch: () => {},
})

// What one field should show. Errors appear after the user leaves the field (or after Save is clicked),
// and then update live while they type, so a fixed problem disappears instantly.
export function useIssue(name) {
  const c = useContext(FormCtx)
  if (!name) return { error: '', need: '', touch: () => {} }
  const shown = c.submitted || c.touched.has(name)
  return {
    error: shown ? c.errors[name] || '' : '',
    need: shown && !c.errors[name] ? c.needs[name] || '' : '',
    touch: () => c.touch(name),
  }
}
