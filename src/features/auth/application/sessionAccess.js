export const isGlobalUser = (user) =>
  Boolean(user?.is_superuser) ||
  String(user?.role || '').toUpperCase() === 'GLOBAL' ||
  String(user?.role_scope || user?.scope || user?.profile?.role_scope || user?.profile?.scope || '').toUpperCase() === 'GLOBAL';

export const isCompanyAdmin = (user) =>
  !isGlobalUser(user) &&
  (Boolean(user?.profile?.is_company_admin) ||
    String(user?.role_code || user?.profile?.role_code || '').toLowerCase() === 'admin_empresa');

export const getPrimaryRole = (user) => {
  if (isGlobalUser(user)) return 'GLOBAL';
  if (isCompanyAdmin(user)) return 'EMPRESA';
  if (String(user?.role || '').toUpperCase() === 'ADMIN' && (user?.empresa || user?.company || user?.profile?.empresa)) return 'EMPRESA';
  if (user?.role) return user.role;
  if (user?.userRole) return user.userRole;
  if (Array.isArray(user?.roles) && user.roles.length) return user.roles[0];
  return 'EMPRESA';
};

export const canAccessAny = (hasPermission, permissions = []) => {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(permission));
};
