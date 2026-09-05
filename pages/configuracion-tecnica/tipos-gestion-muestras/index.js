import RequirePermission from '@features/auth/presentation/RequirePermission';
import SampleManagementTypesPage from '../../../src/features/technical-config/presentation/pages/SampleManagementTypesPage';

export default function ProtectedSampleManagementTypesPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <SampleManagementTypesPage {...props} />
    </RequirePermission>
  );
}
