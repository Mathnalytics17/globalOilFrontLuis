import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalLimitsPage from '@features/technical-config/presentation/pages/TechnicalLimitsFinalPage';

export default function ProtectedTechnicalLimitsPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalLimitsPage {...props} initialMode="list" />
    </RequirePermission>
  );
}
