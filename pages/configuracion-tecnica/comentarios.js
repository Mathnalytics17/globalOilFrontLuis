import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalLimitCommentsPage from '../../src/features/technical-config/presentation/pages/TechnicalLimitCommentsPage';

export default function ProtectedTechnicalLimitCommentsPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalLimitCommentsPage {...props} />
    </RequirePermission>
  );
}
