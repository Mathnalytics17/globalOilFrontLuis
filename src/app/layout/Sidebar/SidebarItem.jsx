import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { isRouteActive } from './sidebar.utils';

export default function SidebarItem({
  item,
  currentPath,
  isExpanded,
  depth = 0,
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (item.kind === 'header') {
    return isExpanded ? (
      <li className="mb-4 border-b border-gray-600 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {item.label}
      </li>
    ) : null;
  }

  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const active = isRouteActive(currentPath, item);
  const Icon = item.icon;

  useEffect(() => {
    if (active && hasChildren) {
      setIsOpen(true);
    }
  }, [active, hasChildren]);

  const itemClass = `flex min-h-[52px] w-full items-center gap-5 px-5 text-left text-white transition duration-200 hover:bg-gray-700 ${
    active ? 'bg-slate-700/70' : ''
  } ${depth > 0 ? 'pl-10' : ''}`;

  const content = (
    <>
      {Icon && (
        <span className="flex h-7 w-7 flex-none items-center justify-center">
          <Icon className="h-7 w-7 text-white" strokeWidth={2.1} />
        </span>
      )}

      {isExpanded && (
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">
          {item.label}
        </span>
      )}
    </>
  );

  if (hasChildren) {
    return (
      <li className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          className={itemClass}
          title={isExpanded ? undefined : item.label}
          onClick={() => setIsOpen((value) => !value)}
        >
          {content}
          {isExpanded && (
            <ChevronDown
              className={`h-5 w-5 flex-none transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {isExpanded && isOpen && (
          <ul className="mt-1 space-y-1">
            {item.children.map((child) => (
              <SidebarItem
                key={child.id}
                item={child}
                currentPath={currentPath}
                isExpanded={isExpanded}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="relative">
      <Link
        href={item.href}
        className={`${itemClass} no-underline hover:no-underline focus:no-underline`}
        style={{ textDecoration: 'none' }}
        title={isExpanded ? undefined : item.label}
        onClick={onNavigate}
      >
        {content}
      </Link>
    </li>
  );
}
