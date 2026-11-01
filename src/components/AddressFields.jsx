import { TextField } from './Field'

// `prefix` is the form key ("current_address" or "permanent_address"), used for error lookup.
export default function AddressFields({ prefix, value, onChange, autofill = false, required = false }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v })
  const ac = (name) => (autofill ? name : 'off')
  return (
    <div className="fgrid">
      <TextField
        className="span2"
        label="Address line 1"
        name={`${prefix}.line1`}
        required={required}
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
      <TextField
        label="City"
        name={`${prefix}.city`}
        required={required}
        value={value.city}
        onChange={set('city')}
        autoComplete={ac('address-level2')}
        maxLength={80}
      />
      <TextField
        label="State"
        name={`${prefix}.state`}
        required={required}
        value={value.state}
        onChange={set('state')}
        autoComplete={ac('address-level1')}
        maxLength={80}
      />
      <TextField
        label="PIN / postal code"
        name={`${prefix}.pincode`}
        required={required}
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
