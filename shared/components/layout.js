import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Menu,
  Dashboard,
  Science,
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
  Settings as SettingsIcon,
  ExitToApp,
  Notifications
} from '@mui/icons-material';

// Estructura de navegación
const ALL_NAV_ITEMS = [
  {
    kind: 'header',
    title: 'Panel de administración',
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
  },
  {
    segment: 'activesTree',
    title: 'Árbol de activos',
    icon: <Dashboard />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO']
  },
  {
    segment: 'pruebas',
    title: 'Pruebas',
    icon: <Science />,
    roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
  },
  {
    segment: 'machines',
    title: 'Maquinas',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'LABORATORISTA', 'OPERARIO'],
  },
  {
    segment: '/muestras',
    title: 'Muestras',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'LABORATORISTA', 'OPERARIO'],
    children: [
      {
        segment: '/muestras',
        title: 'lista de muestras',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO']
      },
  
      {
        segment: '/muestras/ingresar-muestra-lab',
        title: 'Ingreso al laboratorio',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
      },
      {
        segment: '/muestras/revision-muestras',
        title: 'Revisar Muestras',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
      },
    ]
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <Timeline />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
  },
  {
    segment: 'documents-list',
    title: 'Reportes',
    icon: <Folder />,
    roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
  },
  {
    segment: 'administrationPanel/users-management',
    title: 'Gestión de usuarios',
    icon: <Person />,
    roles: ['GLOBAL', 'ADMIN']
  },
  {
    segment: 'managment-companies',
    title: 'Gestión de empresas',
    icon: <Business />,
    roles: ['GLOBAL','ADMIN']
  },
  {
    segment: 'config',
    title: 'Configuración del sistema',
    icon: <Settings />,
    roles: ['GLOBAL'],
    children: [
      {
        segment: 'limits',
        title: 'Limites',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA'],
        children: [
      {
        segment: 'limits/limits-list',
        title: 'Ver limites',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
      },
      
    ]
      },
      {
        segment: '',
        title: 'Configurar parámetros',
        icon: <Description />,
        roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
      },
    ]
  }
];

const NavItem = ({ item, userRole, isExpanded, onMobileClose }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Filtrar por roles
  if (!item.roles.includes(userRole)) {
    return null;
  }

  if (item.kind === 'header') {
    return isExpanded ? (
      <li className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-600">
        {item.title}
      </li>
    ) : null;
  }

  const hasChildren = item.children && item.children.length > 0;
  const isActive = router.pathname.includes(item.segment);

  const handleClick = () => {
    if (onMobileClose) {
      onMobileClose(); // Cerrar sidebar en móvil al hacer clic
    }
  };

  return (
    <li className="relative">
      {hasChildren ? (
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full p-3 hover:bg-gray-700 cursor-pointer transition duration-200 flex items-center justify-between ${
              isActive ? 'bg-gray-700' : ''
            }`}
            title={isExpanded ? '' : item.title}
          >
            <div className="flex items-center">
              <span className="text-white">{item.icon}</span>
              {isExpanded && (
                <span className="ml-3 text-sm flex-1 text-left">{item.title}</span>
              )}
            </div>
            {isExpanded && (
              <ExpandMore className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </button>
          
          {isExpanded && isOpen && (
            <ul className="ml-4 mt-1 space-y-1">
              {item.children.map((child, index) => (
                <NavItem 
                  key={index} 
                  item={child} 
                  userRole={userRole} 
                  isExpanded={isExpanded}
                  onMobileClose={onMobileClose}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Link 
          href={`/${item.segment}`}
          className={`block p-3 hover:bg-gray-700 cursor-pointer transition duration-200 flex items-center no-underline ${
            isActive ? 'bg-gray-700' : ''
          }`}
          title={isExpanded ? '' : item.title}
          onClick={handleClick}
        >
          <span className="text-white">{item.icon}</span>
          {isExpanded && (
            <span className="ml-3 text-sm flex-1 text-white">{item.title}</span>
          )}
        </Link>
      )}
    </li>
  );
};

const SideBar = ({ userRole = 'ADMIN', isExpanded, onToggle, isMobileOpen, onMobileClose }) => {
  return (
    <>
      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-screen flex flex-col bg-[#292929] text-white shadow-lg z-50 transition-all duration-300
          ${isExpanded ? 'w-64' : 'w-16'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:mt-16`}
      >
        {/* Botón cerrar en móvil */}
        {isMobileOpen && (
          <div className="flex justify-end p-4 lg:hidden">
            <button
              onClick={onMobileClose}
              className="text-white hover:bg-gray-700 rounded p-2"
            >
              <Close />
            </button>
          </div>
        )}
        
        {/* Lista de navegación */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1 p-2">
            {ALL_NAV_ITEMS.map((item, index) => (
              <NavItem 
                key={index} 
                item={item} 
                userRole={userRole} 
                isExpanded={isExpanded}
                onMobileClose={onMobileClose}
              />
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

const ProfileDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
 const { logout } = useAuth();
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    logout(); // Usa el logout del AuthContext
  };

  const menuItems = [
    { icon: <AccountCircle className="text-lg" />, label: 'Mi Perfil', action: () => console.log('Ir a perfil') },
    { icon: <SettingsIcon className="text-lg" />, label: 'Configuración', action: () => console.log('Ir a configuración') },
    { icon: <Notifications className="text-lg" />, label: 'Notificaciones', action: () => console.log('Ir a notificaciones') },
    { type: 'divider' },
    { icon: <ExitToApp className="text-lg" />, label: 'Cerrar Sesión', action: handleLogout, isDanger: true }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del perfil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded transition duration-200 text-white"
        title="Menú de usuario"
      >
        <AccountCircle className="text-2xl" />
        <span className="hidden sm:inline">Mi Cuenta</span>
        <ExpandMore className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#292929] border border-gray-600 rounded-lg shadow-lg z-40">
          <div className="py-1">
            {/* Información del usuario - ahora con datos reales */}
            <div className="px-4 py-2 border-b border-gray-600">
              <p className="text-sm font-medium text-white">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400">
                {user?.email || 'email@ejemplo.com'}
              </p>
              <p className="text-xs text-blue-400">
                {user?.role || user?.userRole || 'ADMIN'}
              </p>
            </div>
            
            {/* Opciones del menú */}
            {menuItems.map((item, index) => (
              item.type === 'divider' ? (
                <div key={index} className="border-t border-gray-600 my-1" />
              ) : (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm text-left transition duration-200 hover:bg-gray-700 ${
                    item.isDanger ? 'text-red-400 hover:text-red-300' : 'text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Actualiza el Navbar para recibir el usuario
const Navbar = ({ onToggleSidebar, isSidebarExpanded, onToggleMobile, user }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-[#292929] text-white z-30 flex items-center justify-between px-4">
      {/* Logo y botón hamburguesa */}
      <div className="flex items-center space-x-4">
        {/* Botón hamburguesa para móvil */}
        <button
          onClick={onToggleMobile}
          className="p-2 hover:bg-gray-700 rounded transition duration-200 text-white lg:hidden"
          title="Abrir menú"
        >
          <Menu />
        </button>
        
        {/* Botón expandir/contraer para desktop */}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-700 rounded transition duration-200 text-white hidden lg:block"
          title={isSidebarExpanded ? 'Contraer menú' : 'Expandir menú'}
        >
          {isSidebarExpanded ? <ChevronLeft /> : <Menu />}
        </button>
        
        <img 
          src='/logo-global-oil.png' 
          alt="Global Oil"
          className="h-8 w-auto"
        />
      </div>

      {/* Menú de usuario con dropdown */}
      <div className="flex items-center space-x-2">
        <ProfileDropdown user={user} />
      </div>
    </nav>
  );
};

const Layout = ({ children }) => {
  const { user } = useAuth(); // Obtener el usuario del contexto
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Obtener el rol del usuario o usar 'ADMIN' como fallback
  const userRole = user?.role || user?.userRole || 'ADMIN';
  
  console.log('Usuario en Layout:', user);
  console.log('Rol detectado:', userRole);

  // Cerrar sidebar móvil al cambiar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const handleToggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleCloseMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar 
        onToggleSidebar={handleToggleSidebar}
        onToggleMobile={handleToggleMobile}
        isSidebarExpanded={isSidebarExpanded}
        user={user} // Pasar el usuario al Navbar si es necesario
      />
      
      <div className="flex flex-1">
        <SideBar 
          userRole={userRole} // Pasar el rol real del usuario
          isExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          onToggle={handleToggleSidebar}
          onMobileClose={handleCloseMobile}
          user={user} // Pasar el usuario si el SideBar lo necesita
        />
        
        {/* Contenido principal con márgenes responsive */}
        <main className={`flex-1 min-h-screen transition-all duration-300 mt-16 w-full
          ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-16'}
          ${isMobileOpen ? 'overflow-hidden' : ''}`}
        >
          <div className="p-0 sm:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
