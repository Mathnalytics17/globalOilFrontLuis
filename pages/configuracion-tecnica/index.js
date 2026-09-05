import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalConfigEntryPage from '../../src/features/technical-config/presentation/pages/TechnicalConfigEntryPage';

function ConfiguracionTecnicaPage() {
  return <TechnicalConfigEntryPage />;
}


export default function ProtectedConfiguracionTecnicaPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <ConfiguracionTecnicaPage {...props} />
    </RequirePermission>
  );
}
