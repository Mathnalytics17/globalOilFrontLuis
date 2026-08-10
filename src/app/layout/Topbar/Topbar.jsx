import { ChevronLeft, Menu } from 'lucide-react';

import UserMenu from '../UserMenu/UserMenu';

export default function Topbar({
  isSidebarExpanded,
  onToggleSidebar,
  onToggleMobile,
  user,
}) {
  return (
    <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between bg-[#292929] px-6 text-white shadow-sm lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label="Abrir menú"
          className="inline-flex rounded p-2 text-white transition hover:bg-gray-700 lg:hidden"
          onClick={onToggleMobile}
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          type="button"
          aria-label={isSidebarExpanded ? 'Contraer menú' : 'Expandir menú'}
          className="hidden rounded p-2 text-white transition hover:bg-gray-700 lg:inline-flex"
          onClick={onToggleSidebar}
        >
          {isSidebarExpanded ? (
            <ChevronLeft className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        <img
          src="/logo-global-oil.png"
          alt="Global Oil"
          className="h-8 w-auto flex-none"
        />
      </div>

      <UserMenu user={user} />
    </header>
  );
}
