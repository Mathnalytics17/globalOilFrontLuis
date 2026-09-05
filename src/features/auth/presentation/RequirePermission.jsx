import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../application/AuthContext';
import { canAccessAny, isGlobalUser } from '../application/sessionAccess';

export default function RequirePermission({ permissionsAny = [], permissionsAll = [], children }) {
  const router = useRouter();
  const { user, isLoading, hasPermission } = useAuth();
  const allowed =
    Boolean(user) &&
    (isGlobalUser(user) ||
      (canAccessAny(hasPermission, permissionsAny) &&
        permissionsAll.every((permission) => hasPermission(permission))));

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      router.replace('/unauthorized');
    }
  }, [allowed, isLoading, router, user]);

  if (isLoading || !user || !allowed) {
    return null;
  }

  return children;
}
