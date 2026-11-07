export default function GlobalOilLoader({ label = 'Cargando información...' }) {
  return (
    <div className="go-loader" role="status" aria-live="polite" aria-label={label}>
      <span className="go-loader-mark" aria-hidden="true" />
      <span className="go-loader-pulse" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
