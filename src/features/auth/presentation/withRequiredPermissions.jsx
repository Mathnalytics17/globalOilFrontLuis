import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from './context/AuthContext';

// This access gate belongs to the authentication feature. Keeping it here
// prevents shared UI primitives from depending on a feature implementation.
export default function withRequiredPermissions(Page, permissions = [], fallback = '/muestras/lotes') {
  function PermissionProtectedPage(props) {
    const router = useRouter();
    const { isLoading, hasPermission } = useAuth();
    const allowed = permissions.every((permission) => hasPermission(permission));

    useEffect(() => {
      if (!isLoading && !allowed) void router.replace(fallback).catch(() => {});
    }, [allowed, fallback, isLoading, router]);

    if (isLoading || !allowed) return <div className="go-empty-state">Verificando permisos de acceso...</div>;
    return <Page {...props} />;
  }

  PermissionProtectedPage.displayName = `withRequiredPermissions(${Page.displayName || Page.name || 'Page'})`;
  return PermissionProtectedPage;
}
