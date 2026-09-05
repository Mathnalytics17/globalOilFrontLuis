import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalPredefinedTestBatchesPage from '../../src/features/technical-config/presentation/pages/TechnicalPredefinedTestBatchesPage';

export default function ProtectedTechnicalPredefinedTestBatchesPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalPredefinedTestBatchesPage {...props} />
    </RequirePermission>
  );
}
