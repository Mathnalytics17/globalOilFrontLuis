import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/router';

import SidebarItem from './SidebarItem';
import { SIDEBAR_NAVIGATION } from './sidebar.config';
import { filterNavigationByRole } from './sidebar.utils';

export default function Sidebar({
  userRole = 'EMPRESA',
  isExpanded,
  isMobileOpen,
  onMobileClose,
}) {
  const router = useRouter();

  const navigation = useMemo(
    () => filterNavigationByRole(SIDEBAR_NAVIGATION, userRole),
    [userRole]
  );

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`app-sidebar fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] flex-col bg-[#292929] text-white shadow-lg transition-all duration-300 lg:flex ${
          isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'
        }`}
        aria-label="Navegación principal"
      >
        <nav className="app-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 p-3">
            {navigation.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                currentPath={router.pathname}
                isExpanded={isExpanded}
                onNavigate={onMobileClose}
              />
            ))}
          </ul>
        </nav>
      </aside>

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[20rem] flex-col bg-[#292929] text-white shadow-lg transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegación móvil"
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
          <img
            src="/logo-global-oil.png"
            alt="Global Oil"
            className="h-8 w-auto flex-none"
          />
          <button
            type="button"
            aria-label="Cerrar menú"
            className="rounded p-2 text-white transition hover:bg-gray-700"
            onClick={onMobileClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="app-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 p-3">
            {navigation.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                currentPath={router.pathname}
                isExpanded={true}
                onNavigate={onMobileClose}
              />
            ))}
          </ul>
        </nav>
      </aside>

      <style jsx global>{`
        .app-sidebar.sidebar-expanded {
          width: var(--sidebar-width);
        }

        .app-sidebar.sidebar-collapsed {
          width: var(--sidebar-width);
        }
      `}</style>
    </>
  );
}
