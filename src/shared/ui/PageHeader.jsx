export default function PageHeader({ title, subtitle, eyebrow, actions, children, compact = false }) {
  return (
    <header className={`go-page-heading ${compact ? 'go-page-heading--compact' : ''}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="go-page-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="go-page-subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="go-page-heading-actions">{actions}</div> : null}
    </header>
  );
}
