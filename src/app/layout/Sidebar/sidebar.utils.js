import { getPrimaryRole as getSessionPrimaryRole } from '@features/auth/application/sessionAccess';

export function userCanSeeItem(item, userRole, hasPermission = () => true) {
  const roleAllowed = !item.roles?.length || item.roles.includes(userRole);
  const permissionAllowed =
    !item.permissionsAny?.length || item.permissionsAny.some((permission) => hasPermission(permission));
  const requiredPermissionsAllowed =
    !item.permissionsAll?.length || item.permissionsAll.every((permission) => hasPermission(permission));

  return roleAllowed && permissionAllowed && requiredPermissionsAllowed;
}

export function filterNavigation(items, userRole, hasPermission = () => true) {
  return items
    .filter((item) => userCanSeeItem(item, userRole, hasPermission))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavigation(item.children, userRole, hasPermission)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0 || item.href);
}

export function normalizePath(path) {
  if (!path) return '';
  const withoutQuery = path.split('?')[0].split('#')[0];
  if (withoutQuery === '/') return '/';
  return withoutQuery.endsWith('/') ? withoutQuery.slice(0, -1) : withoutQuery;
}

export function isRouteActive(currentPath, item) {
  if (!item.href) return false;

  const current = normalizePath(currentPath);
  const href = normalizePath(item.href);

  if (current === href) return true;

  if (item.children?.some((child) => isRouteActive(currentPath, child))) return true;

  return href !== '/' && current.startsWith(`${href}/`);
}

export function getPrimaryRole(user) {
  return getSessionPrimaryRole(user);
}
