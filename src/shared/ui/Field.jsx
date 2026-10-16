export default function Field({ label, hint, required = false, className = '', children }) {
  return (
    <label className={`go-field-label ${className}`}>
      {label ? <span>{label}{required ? ' *' : ''}</span> : null}
      {children}
      {hint ? <small className="go-field-hint">{hint}</small> : null}
    </label>
  );
}
