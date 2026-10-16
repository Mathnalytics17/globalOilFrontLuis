import PageHeader from '@shared/ui/PageHeader';

export default function TechnicalConfigShell({ children, title, subtitle, action, actions, kicker = 'Configuración técnica' }) {
  return (
    <div className="go-page go-technical-page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        eyebrow={kicker}
        actions={actions || action}
        compact
      />
      {children}
    </div>
  );
}

// Legacy export kept temporarily for screens that still import `styles` from this module.
// New code should use the shared design-system classes/components instead.
export const styles = {
  page: { minHeight: 'auto', background: 'transparent', color: 'var(--go-text)', padding: 0, fontFamily: 'inherit', maxWidth: '100%', overflowX: 'hidden' },
  nav: { display: 'none' },
  navItem: { color: 'var(--go-text-soft)', textDecoration: 'none', padding: '8px 0', fontSize: 12, fontWeight: 600 },
  navItemActive: { color: '#fff', borderBottom: '2px solid var(--go-accent)' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' },
  kicker: { color: 'var(--go-muted)', letterSpacing: 1.1, fontWeight: 650, margin: '0 0 6px', fontSize: 10.5, textTransform: 'uppercase' },
  title: { margin: 0, fontSize: 'clamp(24px, 2.5vw, 30px)', lineHeight: 1.1, fontWeight: 650, letterSpacing: '-.03em' },
  subtitle: { color: 'var(--go-muted)', fontSize: 13, margin: '6px 0 0', maxWidth: 880, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 7, flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  card: { background: 'var(--go-surface)', border: '1px solid var(--go-border-soft)', borderRadius: 10, padding: 16, boxShadow: 'none', minWidth: 0 },
  cardTitle: { margin: '0 0 7px', fontSize: 16, fontWeight: 650 },
  muted: { color: 'var(--go-muted)', lineHeight: 1.45, fontSize: 12 },
  btn: { border: '1px solid var(--go-accent)', borderRadius: 7, minHeight: 36, padding: '0 11px', fontSize: 12.5, fontWeight: 650, color: '#fff', background: 'var(--go-accent)', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnGhost: { background: 'var(--go-surface-raised)', border: '1px solid var(--go-border-strong)', color: 'var(--go-text-soft)' },
  btnBlue: { background: 'var(--go-surface-raised)', border: '1px solid var(--go-border-strong)', color: 'var(--go-text-soft)' },
  input: { width: '100%', boxSizing: 'border-box', background: '#141518', border: '1px solid var(--go-border-strong)', borderRadius: 7, color: '#fff', padding: '7px 10px', outline: 'none', minHeight: 36, fontSize: 13 },
  label: { display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12, color: '#b8bdc5' },
  field: { marginBottom: 12 },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--go-border-soft)', borderRadius: 9, maxWidth: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 680 },
  th: { textAlign: 'left', padding: '9px 11px', color: 'var(--go-muted)', background: 'var(--go-surface-raised)', borderBottom: '1px solid var(--go-border-soft)', fontSize: 10.5, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase' },
  td: { padding: 10, borderBottom: '1px solid var(--go-border-soft)', color: 'var(--go-text-soft)', fontSize: 12.5, verticalAlign: 'middle' },
  pill: { borderRadius: 999, padding: '3px 7px', background: 'var(--go-surface-raised)', border: '1px solid var(--go-border-strong)', color: 'var(--go-text-soft)', display: 'inline-block', fontSize: 10.5, fontWeight: 600 },
  error: { background: 'rgba(228,93,101,.08)', border: '1px solid rgba(228,93,101,.25)', color: '#f3b5b8', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 },
  ok: { background: 'rgba(79,181,122,.08)', border: '1px solid rgba(79,181,122,.25)', color: '#9dd6b4', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 },
};
