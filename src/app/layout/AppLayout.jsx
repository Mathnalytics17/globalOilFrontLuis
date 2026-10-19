import { useEffect, useState } from 'react';

import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { getPrimaryRole } from '@features/auth/application/sessionAccess';
import { resolveHomeRoute } from '@features/auth/application/homeRoute';

import Sidebar from './Sidebar/Sidebar';
import Topbar from './Topbar/Topbar';

const DESKTOP_SIDEBAR_KEY = 'globaloil.sidebar.open.v2';

export default function AppLayout({ children }) {
  const { user, hasPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const userRole = getPrimaryRole(user) || 'EMPRESA';
  const homePath = resolveHomeRoute(user, hasPermission);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DESKTOP_SIDEBAR_KEY);
      if (saved !== null) setIsDesktopOpen(saved !== 'false');
    } catch (_) {
      // localStorage may be unavailable in hardened browsers; default to compact.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, String(isDesktopOpen));
    } catch (_) {
      // Keep the control functional even if persistence is unavailable.
    }
  }, [isDesktopOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const toggleNavigation = () => {
    if (window.matchMedia('(min-width: 1280px)').matches) {
      setIsDesktopOpen((value) => !value);
    } else {
      setIsMobileOpen((value) => !value);
    }
  };

  const desktopOffset = isDesktopOpen ? 'xl:pl-[var(--go-sidebar-width)]' : 'xl:pl-[var(--go-sidebar-rail-width)]';

  return (
    <div className="min-h-screen bg-go-canvas text-go-text">
      <a className="skip-to-content" href="#main-content">Saltar al contenido</a>
      <Sidebar
        userRole={userRole}
        hasPermission={hasPermission}
        isDesktopOpen={isDesktopOpen}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      <Topbar
        onToggleNavigation={toggleNavigation}
        isDesktopOpen={isDesktopOpen}
        isMobileOpen={isMobileOpen}
        user={user}
        homePath={homePath}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className={`min-h-screen min-w-0 overflow-x-clip pt-[var(--go-topbar-height)] transition-[padding] duration-300 ease-out ${desktopOffset}`}
      >
        <div className="app-content-inner min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}
