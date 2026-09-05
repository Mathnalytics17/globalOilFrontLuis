import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalComparisonScaleFormPage from '../../../src/features/technical-config/presentation/pages/TechnicalComparisonScaleFormPage';
export default function Page() { return <RequirePermission permissionsAny={['config_tecnica.editar']}><TechnicalComparisonScaleFormPage/></RequirePermission>; }
