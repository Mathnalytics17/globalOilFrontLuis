import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '@features/auth/presentation/context/AuthContext';

// The UI gate prevents a deep link from mounting a protected workspace. The
// API remains authoritative and validates the same access server-side.
export default function withRequiredPermissions(Page, permissions = [], fallback = '/muestras/lotes') {
  function PermissionProtectedPage(props) {
    const router = useRouter();
    const { isLoading, hasPermission } = useAuth();
    const allowed = permissions.every((permission) => hasPermission(permission));

    useEffect(() => {
      if (!isLoading && !allowed) router.replace(fallback);
    }, [allowed, fallback, isLoading, router]);

    if (isLoading || !allowed) return <div className="go-empty-state">Verificando permisos de acceso...</div>;
    return <Page {...props} />;
  }

  PermissionProtectedPage.displayName = `withRequiredPermissions(${Page.displayName || Page.name || 'Page'})`;
  return PermissionProtectedPage;
}
