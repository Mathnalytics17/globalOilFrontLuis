export const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export const normalizeList = safeArray;

export const slugify = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  || `item_${Date.now()}`;

export const apiErrorToText = (error) => {
  const data = error?.response?.data ?? error?.data ?? error;
  if (!data) return 'Error inesperado.';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(apiErrorToText).join(' | ');
  if (typeof data === 'object') {
    const detail = data.detail || data.error || data.message;
    if (detail) return apiErrorToText(detail);
    const parts = Object.entries(data).map(([key, value]) => `${key}: ${apiErrorToText(value)}`);
    return parts.length ? parts.join(' | ') : 'Error inesperado.';
  }
  return String(data);
};

export const parseError = apiErrorToText;
export const buildErrorMessage = apiErrorToText;

export const getEntityId = (entity) => {
  if (entity === undefined || entity === null || entity === '') return '';
  if (typeof entity !== 'object') return entity;
  return entity.id ?? entity.pk ?? '';
};

export const configNav = [
  ['Inicio', '/configuracion-tecnica'],
  ['Tipos de gestión', '/configuracion-tecnica/tipos-gestion-muestras'],
  ['Core técnico', '/configuracion-tecnica/laboratorio'],
  ['Catálogos e items', '/configuracion-tecnica/catalogos'],
  ['Límites por prueba', '/configuracion-tecnica/limites'],
  ['Equipos y métodos', '/configuracion-tecnica/equipos-metodos'],
  ['Pruebas', '/pruebas'],
];

const colors = {
  page: 'transparent',
  shell: 'transparent',
  panel: 'rgba(23,23,23,.72)',
  panel2: '#0a101b',
  border: '#234168',
  text: '#ffffff',
  muted: '#b6d7ff',
  red: '#ef2333',
  redSoft: '#75101a',
  green: '#0d351f',
  greenBorder: '#1f8c4c',
};

export const styles = {
  page: {
    minHeight: 'auto',
    background: colors.page,
    color: colors.text,
    padding: 0,
    maxWidth: '100%',
    overflowX: 'hidden',
  },
  shell: {
    maxWidth: 1420,
    margin: '0 auto',
    background: colors.shell,
    padding: 0,
    borderRadius: 0,
    minWidth: 0,
  },
  nav: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    background: 'rgba(18,18,18,.68)',
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 12,
    marginBottom: 28,
  },
  navLink: (active) => ({
    color: colors.text,
    textDecoration: 'none',
    padding: '13px 20px',
    borderRadius: 10,
    fontWeight: 800,
    background: active ? colors.red : 'transparent',
  }),
  hero: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: colors.red,
    fontWeight: 900,
  },
  eyebrow: {
    color: colors.red,
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 10,
  },
  h1: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 900,
  },
  sub: {
    margin: '8px 0 0',
    color: colors.muted,
    lineHeight: 1.55,
    fontSize: 16,
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
    gap: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
  },
  card: {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 22,
    boxShadow: 'none',
    minWidth: 0,
  },
  cardTitle: {
    margin: '0 0 14px',
    fontSize: 22,
    fontWeight: 900,
  },
  label: {
    display: 'block',
    margin: '14px 0 7px',
    color: colors.text,
    fontWeight: 900,
  },
  input: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.panel2,
    color: colors.text,
    padding: '0 14px',
    outline: 'none',
    fontSize: 15,
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.panel2,
    color: colors.text,
    padding: '0 14px',
    outline: 'none',
    fontSize: 15,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: 84,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.panel2,
    color: colors.text,
    padding: 14,
    outline: 'none',
    fontSize: 15,
    boxSizing: 'border-box',
  },
  button: {
    minHeight: 48,
    border: 0,
    borderRadius: 10,
    background: colors.red,
    color: colors.text,
    fontWeight: 900,
    padding: '0 20px',
    cursor: 'pointer',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: '#203754',
    color: colors.text,
    fontWeight: 900,
    padding: '0 16px',
    cursor: 'pointer',
  },
  dangerButton: {
    minHeight: 38,
    borderRadius: 9,
    border: '1px solid #ff4250',
    background: '#24080b',
    color: colors.text,
    fontWeight: 900,
    padding: '0 14px',
    cursor: 'pointer',
  },
  error: {
    background: colors.redSoft,
    border: `1px solid ${colors.red}`,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
    margin: '14px 0 20px',
    whiteSpace: 'pre-wrap',
  },
  ok: {
    background: colors.green,
    border: `1px solid ${colors.greenBorder}`,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
    margin: '14px 0 20px',
  },
  tableWrap: {
    width: '100%',
    overflowX: 'hidden',
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    maxWidth: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 0,
    tableLayout: 'fixed',
  },
  th: {
    textAlign: 'left',
    padding: '13px 14px',
    color: colors.muted,
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  td: {
    padding: '13px 14px',
    borderBottom: `1px solid ${colors.border}`,
    verticalAlign: 'top',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 10px',
    background: '#102f5a',
    color: colors.text,
    fontSize: 12,
    fontWeight: 900,
  },
};
