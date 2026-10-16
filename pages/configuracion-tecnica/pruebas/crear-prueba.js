import RequirePermission from '@features/auth/presentation/RequirePermission';
import PruebaForm from '@features/technical-config/presentation/components/PruebaForm';

export default function CrearPruebaConfiguracionPage() {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver', 'pruebas.crear']}>
      <PruebaForm mode="create" />
    </RequirePermission>
  );
}
