import { useRouter } from 'next/router';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalComparisonScaleFormPage from '../../../../src/features/technical-config/presentation/pages/TechnicalComparisonScaleFormPage';
export default function Page() { const { query } = useRouter(); return <RequirePermission permissionsAny={['config_tecnica.editar']}><TechnicalComparisonScaleFormPage scaleId={query.id}/></RequirePermission>; }
