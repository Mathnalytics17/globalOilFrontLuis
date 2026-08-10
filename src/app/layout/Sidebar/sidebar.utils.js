import { getPrimaryRole as getSessionPrimaryRole } from '@features/auth/application/sessionAccess';

export function userCanSeeItem(item, userRole) {
  if (!item.roles?.length) return true;
  return item.roles.includes(userRole);
}

export function filterNavigationByRole(items, userRole) {
  return items
    .filter((item) => userCanSeeItem(item, userRole))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavigationByRole(item.children, userRole)
        : undefined,
    }))
    .filter((item) => {
      if (!item.children) return true;
      return item.children.length > 0 || item.href;
    });
}

export function normalizePath(path) {
  if (!path) return '';
  if (path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function isRouteActive(currentPath, item) {
  if (!item.href) return false;

  const current = normalizePath(currentPath);
  const href = normalizePath(item.href);

  if (current === href) return true;

  const childIsActive = item.children?.some((child) =>
    isRouteActive(currentPath, child)
  );

  if (childIsActive) return true;

  return href !== '/' && current.startsWith(`${href}/`);
}

export function getPrimaryRole(user) {
  return getSessionPrimaryRole(user);
}
