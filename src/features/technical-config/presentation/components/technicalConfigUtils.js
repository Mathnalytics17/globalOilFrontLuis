import { getApiErrorMessage } from '@shared/utils/errors';

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
  if (error?.response || error?.request) return getApiErrorMessage(error, 'No se pudo completar la operación.');
  const data = error?.response?.data ?? error?.data ?? error;
  if (!data) return 'No se pudo completar la operación.';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(apiErrorToText).join(' | ');
  if (typeof data === 'object') {
    const detail = data.detail || data.error || data.message;
    if (detail) return apiErrorToText(detail);
    const parts = Object.entries(data).map(([key, value]) => `${key}: ${apiErrorToText(value)}`);
    return parts.length ? parts.join(' | ') : 'No se pudo completar la operación.';
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
  panel: '#191b1e',
  panel2: '#141518',
  border: 'rgba(255,255,255,.07)',
  borderStrong: '#353940',
  text: '#f3f4f6',
  muted: '#8d939c',
  red: '#ef2b32',
  redSoft: 'rgba(239,43,50,.08)',
  green: 'rgba(79,181,122,.08)',
  greenBorder: 'rgba(79,181,122,.25)',
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
    maxWidth: 1540,
    margin: '0 auto',
    background: colors.shell,
    padding: 0,
    minWidth: 0,
  },
  nav: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
    flexWrap: 'wrap',
    borderBottom: `1px solid ${colors.border}`,
    padding: '0 2px',
    marginBottom: 28,
  },
  navLink: (active) => ({
    position: 'relative',
    color: active ? colors.text : colors.muted,
    textDecoration: 'none',
    padding: '0 0 12px',
    fontSize: 13,
    fontWeight: active ? 700 : 550,
    borderBottom: active ? `2px solid ${colors.red}` : '2px solid transparent',
  }),
  hero: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    background: '#202226',
    border: `1px solid ${colors.border}`,
    color: '#b8bdc5',
    fontSize: 11,
    fontWeight: 800,
  },
  eyebrow: {
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: 650,
    fontSize: 11,
    marginBottom: 8,
  },
  h1: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.12,
    fontWeight: 650,
    letterSpacing: '-0.03em',
  },
  sub: {
    margin: '7px 0 0',
    color: colors.muted,
    lineHeight: 1.55,
    fontSize: 14,
    maxWidth: 850,
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
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
    borderRadius: 12,
    padding: 20,
    boxShadow: 'none',
    minWidth: 0,
  },
  cardTitle: {
    margin: '0 0 14px',
    fontSize: 17,
    fontWeight: 650,
  },
  label: {
    display: 'block',
    margin: '13px 0 7px',
    color: '#b8bdc5',
    fontSize: 12,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    minHeight: 40,
    borderRadius: 7,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.panel2,
    color: colors.text,
    padding: '8px 11px',
    outline: 'none',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    minHeight: 40,
    borderRadius: 7,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.panel2,
    color: colors.text,
    padding: '8px 11px',
    outline: 'none',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: 84,
    borderRadius: 7,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.panel2,
    color: colors.text,
    padding: 11,
    outline: 'none',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  button: {
    minHeight: 40,
    border: `1px solid ${colors.red}`,
    borderRadius: 7,
    background: colors.red,
    color: colors.text,
    fontWeight: 650,
    fontSize: 13,
    padding: '0 14px',
    cursor: 'pointer',
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: 7,
    border: `1px solid ${colors.borderStrong}`,
    background: '#1b1d20',
    color: '#d4d7dc',
    fontWeight: 600,
    fontSize: 13,
    padding: '0 13px',
    cursor: 'pointer',
  },
  dangerButton: {
    minHeight: 36,
    borderRadius: 7,
    border: '1px solid rgba(228,93,101,.25)',
    background: 'rgba(228,93,101,.06)',
    color: '#e9868c',
    fontWeight: 600,
    fontSize: 12,
    padding: '0 11px',
    cursor: 'pointer',
  },
  error: {
    background: colors.redSoft,
    border: '1px solid rgba(239,43,50,.25)',
    color: '#f3b5b8',
    borderRadius: 8,
    padding: 12,
    margin: '14px 0 20px',
    whiteSpace: 'pre-wrap',
    fontSize: 13,
  },
  ok: {
    background: colors.green,
    border: `1px solid ${colors.greenBorder}`,
    color: '#9dd6b4',
    borderRadius: 8,
    padding: 12,
    margin: '14px 0 20px',
    fontSize: 13,
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    maxWidth: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 760,
  },
  th: {
    textAlign: 'left',
    padding: '11px 12px',
    color: colors.muted,
    background: '#1c1e22',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 11,
    fontWeight: 650,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  },
  td: {
    padding: '12px',
    borderBottom: `1px solid ${colors.border}`,
    color: '#d7dade',
    fontSize: 13,
    verticalAlign: 'middle',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 8px',
    background: 'rgba(79,181,122,.08)',
    border: '1px solid rgba(79,181,122,.2)',
    color: '#7bca9b',
    fontSize: 11,
    fontWeight: 650,
  },
};
