import RequirePermission from '@features/auth/presentation/RequirePermission';
import TechnicalEquipmentMethodsPage from '@features/technical-config/presentation/pages/TechnicalEquipmentMethodsPage';

export default function ProtectedTechnicalEquipmentMethodsPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <TechnicalEquipmentMethodsPage {...props} />
    </RequirePermission>
  );
}
