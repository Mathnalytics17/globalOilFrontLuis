import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export default function OverflowMenu({ items = [], label = 'Más acciones', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  const updatePosition = () => {
    const button = ref.current?.querySelector('button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 210;
    const menuHeight = Math.min(menuRef.current?.offsetHeight || 260, 360);
    const viewportPadding = 10;
    const gap = 6;
    const left = align === 'left'
      ? Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding))
      : Math.max(viewportPadding, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding));
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding;
    const roomAbove = rect.top - viewportPadding;
    const openUp = roomBelow < menuHeight && roomAbove > roomBelow;
    const top = openUp
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - viewportPadding);
    setPosition({ top: Math.max(viewportPadding, top), left, width: menuWidth });
  };

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const refresh = () => updatePosition();
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [open, align]);

  const visible = items.filter(Boolean);
  if (!visible.length) return null;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#1c1e21] text-[#9ba1aa] transition hover:border-white/[0.14] hover:bg-[#24272b] hover:text-white"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          role="menu"
          ref={menuRef}
          className="fixed z-[1000] max-h-[min(360px,calc(100vh-20px))] overflow-y-auto rounded-xl border border-white/[0.10] bg-[#17191c] p-1.5 shadow-2xl"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {visible.map((item, index) => {
            if (item.separator) return <div key={`sep-${index}`} className="my-1 border-t border-white/[0.06]" />;
            const Icon = item.icon;
            return (
              <button
                key={item.label || index}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${item.danger ? 'text-[#ef858b] hover:bg-red-500/[0.07]' : 'text-[#d0d4d9] hover:bg-white/[0.05] hover:text-white'}`}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <span className="w-4" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      , document.body)}
    </div>
  );
}
