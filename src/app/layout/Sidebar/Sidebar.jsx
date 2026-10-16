import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/router';

import SidebarItem from './SidebarItem';
import { SIDEBAR_NAVIGATION } from './sidebar.config';
import { filterNavigation } from './sidebar.utils';

function SidebarBody({ navigation, currentPath, onNavigate, mobile = false, collapsed = false }) {
  return (
    <>
      <div className={`flex h-[var(--go-topbar-height)] shrink-0 items-center border-b border-white/[0.06] ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        {collapsed ? (
          <div className="h-9 w-9 overflow-hidden" title="Global Oil">
            <img src="/logo-global-oil.png" alt="Global Oil" className="h-8 w-auto max-w-none object-contain" />
          </div>
        ) : (
          <img src="/logo-global-oil.png" alt="Global Oil" className="h-8 w-auto max-w-[150px] object-contain" />
        )}
        {mobile ? <span className="sr-only">Navegación móvil</span> : null}
      </div>
      <nav className={`go-scrollbar flex-1 overflow-y-auto py-4 ${collapsed ? 'overflow-x-visible px-2' : 'px-3'}`} aria-label="Navegación principal">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              currentPath={currentPath}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </nav>
      <div className={`shrink-0 border-t border-white/[0.06] text-xs text-[#666c75] ${collapsed ? 'px-2 py-4 text-center' : 'px-5 py-4'}`}>
        {collapsed ? (
          <span className="text-[10px] font-medium text-[#6f757e]" title="Global Oil v1.0.0">v1</span>
        ) : (
          <>
            <p className="font-medium text-[#8c929b]">Global Oil</p>
            <p className="mt-1">v1.0.0</p>
          </>
        )}
      </div>
    </>
  );
}

export default function Sidebar({
  userRole = 'EMPRESA',
  hasPermission = () => true,
  isDesktopOpen = true,
  isMobileOpen,
  onMobileClose,
}) {
  const router = useRouter();
  const navigation = useMemo(
    () => filterNavigation(SIDEBAR_NAVIGATION, userRole, hasPermission),
    [userRole, hasPermission]
  );

  const desktopWidthClass = isDesktopOpen ? 'w-[var(--go-sidebar-width)]' : 'w-[var(--go-sidebar-rail-width)]';

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-visible border-r border-white/[0.06] bg-go-sidebar transition-[width] duration-300 ease-out xl:flex ${desktopWidthClass}`}
      >
        <SidebarBody
          navigation={navigation}
          currentPath={router.pathname}
          collapsed={!isDesktopOpen}
        />
      </aside>

      <button
        type="button"
        aria-label="Cerrar menú"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] transition-opacity duration-200 xl:hidden ${isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-white/[0.08] bg-go-sidebar shadow-2xl transition-transform duration-300 ease-out xl:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <button
          type="button"
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#9ca2ab] hover:bg-white/[0.06] hover:text-white"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarBody navigation={navigation} currentPath={router.pathname} onNavigate={onMobileClose} mobile />
      </aside>
    </>
  );
}
