export default function TechnicalConfigShell({ children, title, subtitle, action, actions }) {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>CONFIGURACIÓN TÉCNICA</p>
          <h1 style={styles.title}>{title}</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <div style={styles.actions}>{actions || action}</div>
      </header>
      {children}
    </div>
  );
}

export const styles = {
  page: { minHeight: 'auto', background: 'transparent', color: '#fff', padding: 0, fontFamily: 'inherit', maxWidth: '100%', overflowX: 'hidden' },
  nav: { display: 'none' },
  navItem: { color: '#dbeafe', textDecoration: 'none', padding: '13px 18px', borderRadius: 12, fontWeight: 800 },
  navItemActive: { background: '#e8272d', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' },
  kicker: { color: '#ff4b55', letterSpacing: 4, fontWeight: 900, margin: 0, fontSize: 13 },
  title: { margin: '8px 0 8px', fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.05 },
  subtitle: { color: '#b8cee9', fontSize: 18, margin: 0, maxWidth: 880, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 },
  card: { background: 'rgba(23,23,23,.72)', border: '1px solid #303030', borderRadius: 12, padding: 18, boxShadow: 'none', minWidth: 0 },
  cardTitle: { margin: '0 0 8px', fontSize: 22, fontWeight: 900 },
  muted: { color: '#a9bfdc', lineHeight: 1.5 },
  btn: { border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 900, color: '#fff', background: '#e8272d', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnGhost: { background: '#20222b', border: '1px solid #3a3d4b' },
  btnBlue: { background: '#136bd8' },
  input: { width: '100%', boxSizing: 'border-box', background: '#080c14', border: '1px solid #34425a', borderRadius: 12, color: '#fff', padding: '13px 14px', outline: 'none', minHeight: 48 },
  label: { display: 'block', marginBottom: 6, fontWeight: 800, color: '#dbe7ff' },
  field: { marginBottom: 14 },
  tableWrap: { overflowX: 'hidden', border: '1px solid #2b394d', borderRadius: 14, maxWidth: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 0, tableLayout: 'fixed' },
  th: { textAlign: 'left', padding: 14, color: '#aab6c6', borderBottom: '1px solid #2b394d', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  td: { padding: 14, borderBottom: '1px solid #202c3d', verticalAlign: 'top', overflowWrap: 'anywhere', wordBreak: 'break-word' },
  pill: { borderRadius: 999, padding: '6px 10px', background: '#17243a', color: '#b8d5ff', display: 'inline-block', fontSize: 12, fontWeight: 800 },
  error: { background: '#3a1216', border: '1px solid #c22', color: '#ffd7d7', borderRadius: 12, padding: 12, marginBottom: 14 },
  ok: { background: '#12351f', border: '1px solid #2ca45a', color: '#d8ffe5', borderRadius: 12, padding: 12, marginBottom: 14 },
};
