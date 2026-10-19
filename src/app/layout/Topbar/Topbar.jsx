import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import UserMenu from '../UserMenu/UserMenu';

const routeNames = {
  activesTree: 'Árbol de activos',
  dashboard: 'Dashboard',
  machines: 'Máquinas',
  muestras: 'Muestras',
  lotes: 'Lotes de muestras',
  reportes: 'Reportes',
  seguridad: 'Seguridad y accesos',
  'configuracion-tecnica': 'Configuración técnica',
  'managment-companies': 'Gestión de empresas',
  administrationPanel: 'Administración',
  'users-management': 'Gestión de usuarios',
  'nuevo-lote': 'Ingresar lote',
  'asignacion-pruebas': 'Asignación de pruebas',
  resultados: 'Ingreso de resultados',
  'revision-resultados': 'Revisión de resultados',
  interpretacion: 'Interpretación',
  laboratorio: 'Ingreso al laboratorio',
  'tipos-gestion-muestras': 'Tipos de gestión',
  'unidades-condiciones': 'Unidades y condiciones',
  catalogos: 'Catálogos técnicos',
  limites: 'Límites',
  escalas: 'Escalas de comparación',
  'equipos-metodos': 'Equipos y métodos',
  pruebas: 'Pruebas',
  'lotes-pruebas': 'Lotes predefinidos',
  'campos-muestra': 'Campos de muestra',
  comentarios: 'Comentarios técnicos',
  auditoria: 'Auditoría',
  invitaciones: 'Invitaciones',
  'roles-permisos': 'Roles y permisos',
  usuarios: 'Usuarios',
};

function Breadcrumb({ homePath }) {
  const router = useRouter();
  const parts = router.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('['));
  const segments = parts
    .map((part, index) => ({
      label: routeNames[part] || part.replace(/-/g, ' '),
      href: `/${parts.slice(0, index + 1).join('/')}`,
    }))
    .slice(-3);

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-[#747a83]">
      <Link href={homePath} className="shrink-0 transition hover:text-[#dfe3e8]">Inicio</Link>
      {segments.map((segment, index) => (
        <span key={`${segment.href}-${index}`} className="flex min-w-0 items-center gap-2">
          <span className="text-[#4d5259]">/</span>
          {index === segments.length - 1 ? (
            <span className="truncate text-[#a9aeb6]" aria-current="page">{segment.label}</span>
          ) : (
            <Link
              href={router.pathname === '/machines/historico/reporte' && segment.href === '/machines/historico'
                ? { pathname: segment.href, query: { machine: router.query.machine, point: router.query.point, test: router.query.test } }
                : segment.href}
              className="truncate transition hover:text-[#dfe3e8]"
            >{segment.label}</Link>
          )}
        </span>
      ))}
    </div>
  );
}

export default function Topbar({ onToggleNavigation, isDesktopOpen, isMobileOpen, user, homePath }) {
  const desktopLeft = isDesktopOpen ? 'xl:left-[var(--go-sidebar-width)]' : 'xl:left-[var(--go-sidebar-rail-width)]';
  return (
    <header className={`fixed left-0 right-0 top-0 z-30 h-[var(--go-topbar-height)] border-b border-white/[0.06] bg-[#121315]/95 backdrop-blur transition-[left] duration-300 ease-out ${desktopLeft}`}>
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={isDesktopOpen || isMobileOpen ? 'Ocultar menú' : 'Mostrar menú'}
            title={isDesktopOpen ? 'Contraer navegación' : 'Expandir navegación'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#a6abb3] transition hover:bg-white/[0.06] hover:text-white"
            onClick={onToggleNavigation}
          >
            <span className="xl:hidden"><Menu className="h-5 w-5" /></span>
            <span className="hidden xl:inline-flex">{isDesktopOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</span>
          </button>
          <Breadcrumb homePath={homePath} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
