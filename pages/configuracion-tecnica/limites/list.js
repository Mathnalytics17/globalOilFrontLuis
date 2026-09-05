import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalLimitsPage from '@features/technical-config/presentation/pages/TechnicalLimitsFinalPage';

export default function ProtectedTechnicalLimitsListPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalLimitsPage initialMode="list" {...props} />
    </RequirePermission>
  );
}
