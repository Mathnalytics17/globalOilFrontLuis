import RequirePermission from '@features/auth/presentation/RequirePermission';
import PruebasPage from '../pruebas';

export default function ConfiguracionTecnicaPruebasPage() {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver', 'pruebas.ver']}>
      <PruebasPage />
    </RequirePermission>
  );
}
