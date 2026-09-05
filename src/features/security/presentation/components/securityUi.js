
import Link from 'next/link';
import {
  ArrowBack,
  ChevronRight,
  Close,
  Search,
} from '@mui/icons-material';
import s from './Security.module.css';

export const getList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const getName = (value, fallback = '-') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return (
    value.nombre ||
    value.name ||
    value.razon_social ||
    value.company_name ||
    value.email ||
    value.codigo ||
    fallback
  );
};

export const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value.id || value.pk || '';
};

export const normalizeUser = (user = {}) => {
  const profile = user.profile || user.company_profile || user.perfil || {};
  const company = user.empresa_info || user.company_info || user.empresa || profile.empresa_info || profile.company_info || {};
  const role = profile.role_info || profile.role || user.security_role_info || user.security_role || {};
  return {
    ...user,
    displayName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.username || user.email || `Usuario ${user.id}`,
    displayEmail: user.email || user.username || '-',
    companyName: getName(company, user.empresa_nombre || user.company_name || 'Global Oil'),
    roleName: getName(role, profile.role_name || user.role_name || user.role || '-'),
    accessStatus: user.access_status || profile.status || (user.is_active === false ? 'DISABLED' : 'ACTIVE'),
    profile,
  };
};

export const statusInfo = (status) => {
  const value = String(status || '').toUpperCase();
  if (['ACTIVE', 'ACTIVO', 'ACCEPTED', 'ACEPTADA', 'USED'].includes(value)) {
    return { label: 'Activo', dot: s.green };
  }
  if (['PENDING', 'PENDIENTE', 'PENDING_ACTIVATION'].includes(value)) {
    return { label: 'Pendiente', dot: s.yellow };
  }
  if (['BLOCKED', 'BLOQUEADO', 'REVOKED', 'REVOCADA'].includes(value)) {
    return { label: 'Bloqueado', dot: s.red };
  }
  if (['DISABLED', 'INACTIVE', 'INACTIVO', 'EXPIRED', 'EXPIRADA', 'REMOVED'].includes(value)) {
    return { label: value === 'EXPIRED' || value === 'EXPIRADA' ? 'Expirada' : 'Inactivo', dot: s.gray };
  }
  return { label: status || 'Sin estado', dot: s.gray };
};

export function StatusPill({ status }) {
  const info = statusInfo(status);
  return (
    <span className={s.pill}>
      <span className={`${s.dot} ${info.dot}`} />
      {info.label}
    </span>
  );
}

export function BackLink({ href = '/seguridad', children = 'Volver' }) {
  return (
    <Link href={href} className={s.back}>
      <ArrowBack fontSize="small" />
      {children}
    </Link>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className={s.search}>
      <Search />
      <input className={s.searchInput} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Drawer({ title, children, footer, onClose }) {
  return (
    <aside className={s.drawer}>
      <div className={s.drawerHeader}>
        <h2 className={s.drawerTitle}>{title}</h2>
        <button type="button" className={s.close} onClick={onClose}>
          <Close />
        </button>
      </div>
      {children}
      {footer ? <div className={s.drawerFooter}>{footer}</div> : null}
    </aside>
  );
}

export function SettingsRow({ href, icon, title, description }) {
  return (
    <Link href={href} className={s.settingsRow}>
      <span className={s.iconBox}>{icon}</span>
      <span className={s.rowText}>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <ChevronRight className={s.chevron} />
    </Link>
  );
}

export const getErrorMessage = (error, fallback = 'No se pudo completar la acción.') => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  try {
    if (data) return JSON.stringify(data);
  } catch {}
  return fallback;
};
