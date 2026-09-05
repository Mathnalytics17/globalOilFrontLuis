import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalConfigHomePage from '../../src/features/technical-config/presentation/pages/TechnicalConfigHomePage';

export default function ProtectedTechnicalConfigHomePage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalConfigHomePage {...props} />
    </RequirePermission>
  );
}
