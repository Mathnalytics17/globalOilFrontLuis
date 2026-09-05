import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalUnitsConditionsPage from '../../src/features/technical-config/presentation/pages/TechnicalUnitsConditionsPage';

export default function ProtectedTechnicalUnitsConditionsPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalUnitsConditionsPage {...props} />
    </RequirePermission>
  );
}
