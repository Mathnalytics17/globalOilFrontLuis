import { isCompanyAdmin, isGlobalUser } from './sessionAccess';

export const HOME_OPTIONS = [
  { value: '', label: 'Automático según el rol' },
  { value: '/dashboard', label: 'Dashboard operativo (solo Global Oil)', globalOnly: true },
  { value: '/muestras/lotes', label: 'Lotes de muestras' },
  { value: '/muestras/nuevo-lote', label: 'Registrar lote de muestras' },
  { value: '/muestras/laboratorio', label: 'Ingreso al laboratorio' },
  { value: '/muestras/resultados', label: 'Ingreso de resultados' },
  { value: '/muestras/revision-resultados', label: 'Revisión de resultados' },
  { value: '/muestras/interpretacion', label: 'Interpretación' },
  { value: '/reportes', label: 'Reportes' },
  { value: '/activesTree', label: 'Árbol de activos' },
  { value: '/machines', label: 'Máquinas' },
];

const routePermissions = {
  '/dashboard': ['dashboard.ver_global'],
  '/activesTree': ['activos.ver'],
  '/machines': ['maquinas.ver', 'activos.ver'],
  '/muestras/lotes': ['lotes.ver', 'muestras.ver', 'laboratorio.ver', 'revision.ver', 'interpretacion.ver'],
  '/muestras/nuevo-lote': ['lotes.crear', 'muestras.crear'],
  '/muestras/laboratorio': ['laboratorio.ver', 'laboratorio.ver_lotes_disponibles'],
  '/muestras/resultados': ['resultados.ver', 'resultados.cargar'],
  '/muestras/revision-resultados': ['revision.ver'],
  '/muestras/interpretacion': ['interpretacion.ver'],
  '/reportes': ['reportes.ver'],
};

const roleCode = (user) => String(user?.role_code || user?.profile?.role_code || '').toLowerCase();

export const fallbackHomeForUser = (user) => {
  if (isGlobalUser(user)) return '/dashboard';
  const code = roleCode(user);
  if (code === 'laboratorista' || String(user?.role || '').toUpperCase() === 'LABORATORISTA') return '/muestras/laboratorio';
  if (code === 'revisor_interpretador') return '/muestras/revision-resultados';
  if (code === 'empresa_carga_muestras') return '/muestras/nuevo-lote';
  if (code === 'consulta_cliente' || Boolean(user?.is_read_only)) return '/reportes';
  if (isCompanyAdmin(user)) return '/muestras/lotes';
  return '/muestras/lotes';
};

export const canOpenHomeRoute = (user, route, hasPermission) => {
  if (!Object.prototype.hasOwnProperty.call(routePermissions, route)) return false;
  if (route === '/dashboard') return isGlobalUser(user);
  return routePermissions[route].some((permission) => hasPermission(permission));
};

export const resolveHomeRoute = (user, hasPermission) => {
  // El usuario puede sobrescribir el inicio definido por su rol. Si ambos
  // están vacíos, se conserva el destino lógico establecido por el sistema.
  const preferred = String(user?.home_path || user?.profile?.role_default_home_path || '').trim();
  if (preferred && canOpenHomeRoute(user, preferred, hasPermission)) return preferred;

  const fallback = fallbackHomeForUser(user);
  if (canOpenHomeRoute(user, fallback, hasPermission)) return fallback;

  return HOME_OPTIONS.map(({ value }) => value).find((route) => route && canOpenHomeRoute(user, route, hasPermission)) || '/unauthorized';
};
