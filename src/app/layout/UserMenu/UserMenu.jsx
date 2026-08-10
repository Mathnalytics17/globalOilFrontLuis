import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  LogOut,
  UserCircle,
} from 'lucide-react';

import { useAuth } from '@context/AuthContext';

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();

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
    { icon: UserCircle, label: 'Mi Perfil', action: () => {} },
    { type: 'divider' },
    {
      icon: LogOut,
      label: 'Cerrar Sesión',
      action: () => logout(),
      isDanger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded p-2 text-white transition hover:bg-gray-700"
        onClick={() => setIsOpen((value) => !value)}
        title="Menú de usuario"
      >
        <UserCircle className="h-7 w-7" />
        <span className="hidden text-base sm:inline">Mi Cuenta</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-gray-600 bg-[#292929] shadow-lg"
        >
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

          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 border-t border-gray-600"
                  />
                );
              }

              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-gray-700 ${
                    item.isDanger
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-white'
                  }`}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
