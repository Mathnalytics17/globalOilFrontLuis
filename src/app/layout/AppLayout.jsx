import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@features/auth/application/AuthContext';
import { getPrimaryRole } from '@features/auth/application/sessionAccess';
import { useRouter } from 'next/router';

import {
  Menu,
  Dashboard,
  Folder,
  Description,
  Timeline,
  Person,
  Business,
  Settings,
  ChevronLeft,
  ExpandMore,
  Close,
  AccountCircle,
  ExitToApp,
  Lock,
} from '@mui/icons-material';

const ALL_NAV_ITEMS = [
  {
    kind: 'header',
    title: 'Panel de administración',
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA'],
  },
  {
    segment: 'activesTree',
    title: 'Árbol de activos',
    icon: <Dashboard />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO'],
    permissionsAny: ['activos.ver'],
  },
  {
    segment: '/muestras/lotes',
    title: 'Muestras',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'LABORATORISTA', 'OPERARIO'],
    permissionsAny: ['lotes.ver', 'muestras.ver', 'laboratorio.ver', 'revision.ver', 'interpretacion.ver'],
    children: [
      {
        segment: '/muestras/lotes',
        title: 'Lotes de muestras',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'LABORATORISTA', 'OPERARIO'],
        permissionsAny: ['lotes.ver', 'muestras.ver', 'laboratorio.ver'],
      },
      {
        segment: '/muestras/nuevo-lote',
        title: 'Ingresar lote de muestras',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO'],
        permissionsAny: ['lotes.crear', 'muestras.crear'],
      },
    ],
  },
  {
    segment: 'machines',
    title: 'Máquinas',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO'],
    permissionsAny: ['activos.ver', 'maquinas.ver', 'machines.view'],
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <Timeline />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA'],
    permissionsAny: ['dashboard.ver_global', 'dashboard.ver_empresa', 'dashboard.ver_laboratorio', 'dashboard.ver_reportes'],
  },
  {
    segment: 'reportes',
    title: 'Reportes',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA'],
    permissionsAny: ['reportes.ver'],
  },
  {
    segment: 'administrationPanel/users-management',
    title: 'Gestión de usuarios',
    icon: <Person />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA'],
    permissionsAny: ['usuarios.ver', 'usuarios.invitar'],
  },
  {
    segment: 'managment-companies',
    title: 'Gestión de empresas',
    icon: <Business />,
    roles: ['GLOBAL'],
    permissionsAny: ['empresas.ver'],
  },
  {
    segment: 'seguridad',
    title: 'Seguridad y accesos',
    icon: <Lock />,
    roles: ['GLOBAL'],
    permissionsAny: ['roles.ver', 'permisos.ver_matriz', 'auditoria.ver', 'security.view'],
    children: [
      {
        segment: '/seguridad/usuarios',
        title: 'Usuarios',
        icon: <Person />,
        roles: ['GLOBAL'],
        permissionsAny: ['usuarios.ver', 'usuarios.invitar', 'security.users.view'],
      },
      {
        segment: '/seguridad/invitaciones',
        title: 'Invitaciones',
        icon: <Description />,
        roles: ['GLOBAL'],
        permissionsAny: ['usuarios.invitar', 'invitaciones.ver', 'security.invitations.view'],
      },
      {
        segment: '/seguridad/roles-permisos',
        title: 'Roles y permisos',
        icon: <Settings />,
        roles: ['GLOBAL'],
        permissionsAny: ['permisos.ver_matriz'],
      },
      {
        segment: '/seguridad/auditoria',
        title: 'Auditoría',
        icon: <Timeline />,
        roles: ['GLOBAL'],
        permissionsAny: ['auditoria.ver', 'security.audit.view'],
      },
    ],
  },
  {
    segment: 'configuracion-tecnica',
    title: 'Configuración del sistema',
    icon: <Settings />,
    roles: ['GLOBAL'],
    permissionsAny: ['config_tecnica.ver'],
  },
];

const getHref = (segment) => {
  if (!segment) return '/';
  if (segment.startsWith('/')) return segment;
  return `/${segment}`;
};

const NavItem = ({ item, userRole, hasPermission, isExpanded, onMobileClose, depth = 0 }) => {
  const router = useRouter();
  const hasActiveChild = item.children?.some((child) => router.pathname.includes(child.segment.replace(/^\//, '')));
  const [isOpen, setIsOpen] = useState(Boolean(hasActiveChild));

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  const roleAllowed = !item.roles || item.roles.includes(userRole);
  const permissionAllowed =
    !item.permissionsAny ||
    item.permissionsAny.length === 0 ||
    item.permissionsAny.some((permission) => hasPermission(permission));

  const allowed = roleAllowed && permissionAllowed;

  if (!allowed) {
    return null;
  }

  if (item.kind === 'header') {
    return isExpanded ? (
      <li className="border-b border-gray-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {item.title}
      </li>
    ) : null;
  }

  const hasChildren = item.children && item.children.length > 0;

  const isActive = item.segment
    ? router.pathname.includes(item.segment.replace(/^\//, ''))
    : false;

  const handleClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const nestedItemClass = depth > 0
    ? 'min-h-[44px] rounded-r border-l-2 border-transparent py-1 pl-2 pr-2 hover:border-gray-500'
    : 'p-3';

  return (
    <li className="relative">
      {hasChildren ? (
        <div>
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            className={`flex w-full cursor-pointer items-center justify-between ${nestedItemClass} text-white transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''
              }`}
            title={isExpanded ? '' : item.title}
          >
            <div className="flex min-w-0 items-center">
              <span className="flex h-6 w-6 items-center justify-center text-white">
                {item.icon}
              </span>

              {isExpanded && (
                <span className="ml-3 flex-1 truncate text-left text-sm text-white">
                  {item.title}
                </span>
              )}
            </div>

            {isExpanded && (
              <ExpandMore
                className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                  }`}
              />
            )}
          </button>

          {isExpanded && isOpen && (
            <ul className="relative ml-7 mt-1 space-y-1 border-l border-gray-600 pl-3">
              {item.children.map((child, index) => (
                <NavItem
                  key={`${child.segment}-${index}`}
                  item={child}
                  userRole={userRole}
                  hasPermission={hasPermission}
                  isExpanded={isExpanded}
                  onMobileClose={onMobileClose}
                  depth={depth + 1}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Link
          href={getHref(item.segment)}
          className={`flex cursor-pointer items-center ${nestedItemClass} text-white no-underline transition duration-200 hover:bg-gray-700 hover:no-underline ${isActive ? 'bg-gray-700' : ''
            }`}
          style={{ textDecoration: 'none' }}
          title={isExpanded ? '' : item.title}
          onClick={handleClick}
        >
          {depth > 0 && <span aria-hidden="true" className="absolute -left-3 top-1/2 h-px w-3 bg-gray-600" />}
          <span className={`flex items-center justify-center text-white ${depth > 0 ? 'h-5 w-5 opacity-80' : 'h-6 w-6'}`}>
            {item.icon}
          </span>

          {isExpanded && (
            <span className={`ml-3 flex-1 truncate text-white ${depth > 0 ? 'text-[13px]' : 'text-sm'}`}>
              {item.title}
            </span>
          )}
        </Link>
      )}
    </li>
  );
};

const SideBar = ({
  userRole = 'EMPRESA',
  hasPermission = () => false,
  isExpanded,
  isMobileOpen,
  isDesktop,
  onMobileClose,
}) => {
  const sidebarWidth = isExpanded ? 232 : 72;
  const shouldShowSidebar = isDesktop || isMobileOpen;

  return (
    <>
      {!isDesktop && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          style={{ zIndex: 900 }}
          onClick={onMobileClose}
        />
      )}

      <aside
        className="fixed left-0 flex flex-col bg-[#292929] text-white shadow-lg transition-all duration-300"
        style={{
          zIndex: 1000,
          top: isDesktop ? '64px' : '0px',
          height: isDesktop ? 'calc(100vh - 64px)' : '100vh',
          width: `${sidebarWidth}px`,
          transform: shouldShowSidebar ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {!isDesktop && isMobileOpen && (
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded p-2 text-white transition hover:bg-gray-700"
            >
              <Close />
            </button>
          </div>
        )}

        <nav className="custom-sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 p-2">
            {ALL_NAV_ITEMS.map((item, index) => (
              <NavItem
                key={`${item.segment || item.title}-${index}`}
                item={item}
                userRole={userRole}
                hasPermission={hasPermission}
                isExpanded={isExpanded}
                onMobileClose={!isDesktop ? onMobileClose : undefined}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};
const ProfileDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      icon: <AccountCircle className="text-lg" />,
      label: 'Mi Perfil',
      action: () => router.push('/users/profile'),
    },
    { type: 'divider' },
    {
      icon: <ExitToApp className="text-lg" />,
      label: 'Cerrar sesión',
      action: logout,
      isDanger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center space-x-2 rounded p-2 text-white transition duration-200 hover:bg-gray-700"
        title="Menú de usuario"
      >
        <AccountCircle className="text-2xl" />
        <span className="hidden sm:inline">Mi Cuenta</span>
        <ExpandMore
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-600 bg-[#292929] shadow-lg">
          <div className="py-1">
            <div className="border-b border-gray-600 px-4 py-2">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || 'Usuario'}
              </p>
              <p className="truncate text-xs text-gray-400">
                {user?.email || 'email@ejemplo.com'}
              </p>
              <p className="truncate text-xs text-blue-400">
                {user?.role || user?.userRole || 'Usuario'}
              </p>
            </div>

            {menuItems.map((item, index) =>
              item.type === 'divider' ? (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-gray-600"
                />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center space-x-3 px-4 py-2 text-left text-sm transition duration-200 hover:bg-gray-700 ${item.isDanger
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-white'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const Navbar = ({
  onToggleSidebar,
  isSidebarExpanded,
  onToggleMobile,
  isDesktop,
  user,
}) => {
  return (
    <nav
      className="fixed left-0 top-0 flex w-full items-center justify-between bg-[#292929] px-4 text-white shadow-sm"
      style={{
        height: '64px',
        zIndex: 2000,
      }}
    >
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={isDesktop ? onToggleSidebar : onToggleMobile}
          className="rounded p-2 text-white transition duration-200 hover:bg-gray-700"
          title={isDesktop ? 'Contraer / expandir menú' : 'Abrir menú'}
        >
          {isDesktop && isSidebarExpanded ? <ChevronLeft /> : <Menu />}
        </button>

        <img
          src="/logo-global-oil.png"
          alt="Global Oil"
          className="h-8 w-auto"
        />
      </div>

      <div className="flex items-center space-x-2">
        <ProfileDropdown user={user} />
      </div>
    </nav>
  );
};
const AppLayout = ({ children }) => {
  const { user, hasPermission } = useAuth();

  const [isDesktop, setIsDesktop] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userRole = getPrimaryRole(user);

  useEffect(() => {
    const updateMode = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);

      if (desktop) {
        setIsMobileOpen(false);
      }
    };

    updateMode();

    window.addEventListener('resize', updateMode);
    return () => window.removeEventListener('resize', updateMode);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSidebarExpanded(window.localStorage.getItem('globalOil.sidebarExpanded') === 'true');
  }, []);

  const toggleSidebar = () => {
    setIsSidebarExpanded((value) => {
      const next = !value;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('globalOil.sidebarExpanded', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    document.body.style.overflow = !isDesktop && isMobileOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, isMobileOpen]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const sidebarWidth = isSidebarExpanded ? 232 : 72;

  return (
    <div
      className="bg-black text-white"
      style={{
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <a className="skip-to-content" href="#main-content">Saltar al contenido</a>
      <Navbar
        onToggleSidebar={toggleSidebar}
        onToggleMobile={() => setIsMobileOpen((value) => !value)}
        isSidebarExpanded={isSidebarExpanded}
        isDesktop={isDesktop}
        user={user}
      />

      <SideBar
        userRole={userRole}
        hasPermission={hasPermission}
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileOpen}
        isDesktop={isDesktop}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="custom-content-scroll transition-all duration-300"
        style={{
          position: 'fixed',
          top: '64px',
          right: 0,
          bottom: 0,
          left: isDesktop ? `${sidebarWidth}px` : 0,
          zIndex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#1b1b1b',
        }}
      >
        <div className="app-content-inner">
          {children}
        </div>
      </main>

      <style jsx global>{`
      html,
      body,
      #__next {
        height: 100%;
        overflow: hidden;
        background: #000;
      }

      .custom-sidebar-scroll {
        scrollbar-width: thin;
        scrollbar-color: #4b5563 #292929;
      }

      .custom-sidebar-scroll::-webkit-scrollbar {
        width: 8px;
      }

      .custom-sidebar-scroll::-webkit-scrollbar-track {
        background: #292929;
      }

      .custom-sidebar-scroll::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 999px;
        border: 2px solid #292929;
      }

      .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }

      .custom-content-scroll {
        scrollbar-width: thin;
        scrollbar-color: #4b5563 #050505;
      }

      .custom-content-scroll::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .custom-content-scroll::-webkit-scrollbar-track {
        background: #050505;
      }

      .custom-content-scroll::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 999px;
        border: 2px solid #050505;
      }

      .custom-content-scroll::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }

      .app-content-inner {
        min-height: 100%;
        padding: 24px 28px;
      }

      .skip-to-content {
        position: fixed;
        left: 12px;
        top: -60px;
        z-index: 3000;
        border-radius: 4px;
        background: #fff;
        color: #111;
        padding: 10px 14px;
        font-weight: 700;
      }

      .skip-to-content:focus {
        top: 10px;
      }

      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid #facc15;
        outline-offset: 2px;
      }

      @media (max-width: 1023px) {
        .app-content-inner { padding: 18px 16px; }
      }

      @media (max-width: 640px) {
        .app-content-inner { padding: 12px 10px; }
      }
    `}</style>
    </div>
  );
};

export default AppLayout;
