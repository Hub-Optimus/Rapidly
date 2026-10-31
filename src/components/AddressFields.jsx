import { TextField } from './Field'

export default function AddressFields({ value, onChange, autofill = false }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v })
  const ac = (name) => (autofill ? name : 'off')
  return (
    <div className="fgrid">
      <TextField
        className="span2"
        label="Address line 1"
        value={value.line1}
        onChange={set('line1')}
        autoComplete={ac('address-line1')}
        maxLength={150}
        placeholder="House / flat no., street"
      />
      <TextField
        className="span2"
        label="Address line 2 (optional)"
        value={value.line2}
        onChange={set('line2')}
        autoComplete={ac('address-line2')}
        maxLength={150}
        placeholder="Area, landmark"
      />
      <TextField label="City" value={value.city} onChange={set('city')} autoComplete={ac('address-level2')} maxLength={80} />
      <TextField label="State" value={value.state} onChange={set('state')} autoComplete={ac('address-level1')} maxLength={80} />
      <TextField
        label="PIN / postal code"
        value={value.pincode}
        onChange={set('pincode')}
        autoComplete={ac('postal-code')}
        inputMode="numeric"
        maxLength={10}
      />
      <TextField label="Country" value={value.country} onChange={set('country')} autoComplete={ac('country-name')} maxLength={60} />
    </div>
  )
}
