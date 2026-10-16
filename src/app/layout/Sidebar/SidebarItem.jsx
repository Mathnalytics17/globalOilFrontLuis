import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { isRouteActive } from './sidebar.utils';

export default function SidebarItem({ item, currentPath, depth = 0, onNavigate, collapsed = false }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const active = isRouteActive(currentPath, item);
  const [isOpen, setIsOpen] = useState(active);
  const Icon = item.icon;

  useEffect(() => {
    if (active && hasChildren) setIsOpen(true);
  }, [active, hasChildren]);

  if (item.kind === 'header') {
    if (collapsed) return null;
    return (
      <li className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-go-muted">
        {item.label}
      </li>
    );
  }

  if (collapsed && depth === 0) {
    return (
      <li className="relative flex justify-center">
        <Link
          href={item.href}
          className={`group relative flex h-11 w-11 items-center justify-center rounded-lg no-underline transition-colors duration-150 hover:no-underline ${
            active ? 'bg-white/[0.075] text-white' : 'text-[#858b94] hover:bg-white/[0.05] hover:text-white'
          }`}
          style={{ textDecoration: 'none' }}
          onClick={onNavigate}
          aria-label={item.label}
          title={item.label}
        >
          {Icon ? <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} /> : null}
          {active ? <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-go-red" /> : null}
          <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[70] hidden whitespace-nowrap rounded-md border border-white/[0.08] bg-[#1b1d20] px-2.5 py-1.5 text-xs font-medium text-[#e6e8eb] shadow-xl group-hover:block">
            {item.label}
          </span>
        </Link>
      </li>
    );
  }

  const base = `group relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors duration-150 ${
    depth > 0 ? 'pl-9' : ''
  }`;
  const state = active
    ? 'bg-white/[0.07] text-white'
    : 'text-[#b7bcc5] hover:bg-white/[0.045] hover:text-white';

  const content = (
    <>
      {Icon && (
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${active ? 'text-white' : 'text-[#8e949e] group-hover:text-white'}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
      {hasChildren && (
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#737985] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      )}
      {active && depth === 0 && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-go-red" />}
    </>
  );

  if (hasChildren) {
    return (
      <li>
        <button
          type="button"
          aria-expanded={isOpen}
          className={`${base} ${state}`}
          onClick={() => setIsOpen((value) => !value)}
        >
          {content}
        </button>
        {isOpen && (
          <ul className="mt-1 space-y-1">
            {item.children.map((child) => (
              <SidebarItem
                key={child.id}
                item={child}
                currentPath={currentPath}
                depth={depth + 1}
                onNavigate={onNavigate}
                collapsed={false}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        className={`${base} ${state} no-underline hover:no-underline`}
        style={{ textDecoration: 'none' }}
        onClick={onNavigate}
      >
        {content}
      </Link>
    </li>
  );
}
