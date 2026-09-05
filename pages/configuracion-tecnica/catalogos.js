import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalCatalogsPage from '@features/technical-config/presentation/pages/TechnicalCatalogsPage';

export default function ProtectedTechnicalCatalogsPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalCatalogsPage {...props} />
    </RequirePermission>
  );
}
