import RequirePermission from '@features/auth/presentation/RequirePermission';
import MachinesPage from '../../machines';

export default function ConfiguracionTecnicaMaquinasPage() {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver', 'maquinas.ver']}>
      <MachinesPage />
    </RequirePermission>
  );
}
