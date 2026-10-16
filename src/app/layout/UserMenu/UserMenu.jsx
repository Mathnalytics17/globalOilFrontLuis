import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/router';

import { useAuth } from '@features/auth/presentation/context/AuthContext';

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = String(user?.name || user?.first_name || user?.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const displayName = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Mi cuenta';
  const companyName = user?.company?.name || user?.company_name || user?.empresa?.name || 'Global Oil';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.05]"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#24262a] text-xs font-semibold text-white">
          {initials || 'U'}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[150px] truncate text-sm font-medium text-[#e7e9ed]">{displayName}</span>
          <span className="block max-w-[150px] truncate text-[11px] text-[#7f858e]">{companyName}</span>
        </span>
        <ChevronDown className={`hidden h-4 w-4 text-[#777d86] transition-transform sm:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1b1d20] p-1.5 shadow-2xl">
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#d4d7dc] hover:bg-white/[0.05]"
            onClick={() => { setIsOpen(false); router.push('/users/profile'); }}
          >
            <User className="h-4 w-4" /> Mi perfil
          </button>
          <div className="my-1 border-t border-white/[0.06]" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#f07178] hover:bg-red-500/[0.08]"
            onClick={() => { setIsOpen(false); logout(); }}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
