import { useRouter } from 'next/router';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalLimitsPage from '@features/technical-config/presentation/pages/TechnicalLimitsFinalPage';

export default function ProtectedTechnicalLimitsEditPage(props) {
  const router = useRouter();
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalLimitsPage initialMode="edit" initialSourceId={router.query.id} {...props} />
    </RequirePermission>
  );
}
