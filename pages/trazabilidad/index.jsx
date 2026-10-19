import RequirePermission from '@features/auth/presentation/RequirePermission';
import TraceabilityPage from '@features/traceability/presentation/pages/TraceabilityPage';

export default function ProtectedTraceabilityPage() {
  return (
    <RequirePermission permissionsAll={['trazabilidad.ver']}>
      <TraceabilityPage />
    </RequirePermission>
  );
}
