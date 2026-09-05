import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalComparisonScalesPage from '../../../src/features/technical-config/presentation/pages/TechnicalComparisonScalesPage';
export default function Page() { return <RequirePermission permissionsAny={['config_tecnica.ver']}><TechnicalComparisonScalesPage/></RequirePermission>; }
