
import {
  AdminPanelSettings,
  AssignmentInd,
  ChevronRight,
  History,
  Lock,
  People,
} from '@mui/icons-material';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@features/auth/application/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import s from '../components/Security.module.css';
import { SettingsRow } from '../components/securityUi';

export default function SecurityHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const global = isGlobalUser(user);

  useEffect(() => {
    if (user && !global) {
      router.replace('/administrationPanel/users-management');
    }
  }, [global, router, user]);

  if (user && !global) {
    return null;
  }

  return (
    <main className={s.page}>
      <div className={s.scroll}>
        <section className={s.centerShell}>
          <div className={s.kicker}>Seguridad</div>
          <h1 className={s.title}>Seguridad y accesos</h1>
          <p className={s.subtitle}>
            Administra usuarios, invitaciones, roles, permisos y auditoría. Los usuarios externos solo operan dentro de su empresa.
          </p>

          <div className={s.settingsList}>
            <SettingsRow
              href="/seguridad/usuarios"
              icon={<People fontSize="large" />}
              title="Usuarios"
              description="Gestiona usuarios internos, usuarios de empresa, bloqueos y modo solo lectura."
            />
            <SettingsRow
              href="/seguridad/invitaciones"
              icon={<AssignmentInd fontSize="large" />}
              title="Invitaciones"
              description="Invita usuarios, reenvía enlaces, revoca invitaciones y revisa estados."
            />
            <SettingsRow
              href="/seguridad/roles-permisos"
              icon={<AdminPanelSettings fontSize="large" />}
              title="Roles y permisos"
              description="Configura la matriz de permisos por rol del sistema."
            />
            <SettingsRow
              href="/seguridad/auditoria"
              icon={<History fontSize="large" />}
              title="Auditoría"
              description="Consulta acciones de usuarios, empresas, reportes y seguridad."
            />
          </div>

          <div style={{ marginTop: 28, color: '#8d8d8d', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Lock fontSize="small" />
            Sesión actual: {user?.email || 'usuario'} · {user?.profile?.role_code || user?.role || 'sin rol'}
          </div>
        </section>
      </div>
    </main>
  );
}
