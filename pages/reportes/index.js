import RequirePermission from '@features/auth/presentation/RequirePermission';
import ReportsLibraryPage from '@features/reports/presentation/pages/ReportsLibraryPage';

export default function ProtectedReportsLibraryPage() {
  return (
    <RequirePermission permissionsAll={['reportes.ver']}>
      <ReportsLibraryPage />
    </RequirePermission>
  );
}
