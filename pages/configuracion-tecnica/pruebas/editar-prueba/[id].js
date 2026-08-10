import { useRouter } from 'next/router';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import PruebaForm from '../../../../shared/features/pruebas/PruebaForm';

export default function EditarPruebaConfiguracionPage() {
  const router = useRouter();

  return (
    <RequirePermission permissionsAny={['config_tecnica.ver', 'pruebas.editar']}>
      <PruebaForm mode="edit" id={router.query.id} />
    </RequirePermission>
  );
}
