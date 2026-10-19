import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .trim();

const optionLabel = (option) => String(option?.textContent || option?.label || '').trim();

const matchesSearch = (label, query) => {
  const normalizedLabel = normalize(label);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return tokens.every((token) => normalizedLabel.includes(token));
};

const getOptions = (select) => Array.from(select?.options || []).map((option, index) => ({
  index,
  value: option.value,
  label: optionLabel(option),
  disabled: option.disabled,
  selected: option.selected,
}));

const getPopupPosition = (select) => {
  if (!select || typeof window === 'undefined') return null;
  const rect = select.getBoundingClientRect();
  const gap = 6;
  const viewportPadding = 10;
  const minWidth = Math.min(280, window.innerWidth - viewportPadding * 2);
  const width = Math.max(rect.width, minWidth);
  const safeWidth = Math.min(width, window.innerWidth - viewportPadding * 2);
  const maxHeight = Math.min(420, Math.max(220, window.innerHeight * 0.56));
  const roomBelow = window.innerHeight - rect.bottom - viewportPadding;
  const roomAbove = rect.top - viewportPadding;
  const openUp = roomBelow < 260 && roomAbove > roomBelow;
  const availableHeight = Math.max(180, Math.min(maxHeight, openUp ? roomAbove - gap : roomBelow - gap));
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - safeWidth - viewportPadding),
  );

  return {
    left,
    width: safeWidth,
    maxHeight: availableHeight,
    ...(openUp
      ? { bottom: Math.max(viewportPadding, window.innerHeight - rect.top + gap) }
      : { top: Math.max(viewportPadding, rect.bottom + gap) }),
  };
};

/**
 * Mejora global de los <select> nativos sin cambiar su contrato con React.
 *
 * Conserva el select real (value/name/required/onChange) y reemplaza solamente
 * la interacción del menú del navegador por un panel con búsqueda por cualquier
 * coincidencia. Así todos los formularios existentes mantienen su lógica.
 */
export default function NativeSelectSearch() {
  const [activeSelect, setActiveSelect] = useState(null);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);
  const [revision, setRevision] = useState(0);
  const [highlighted, setHighlighted] = useState(0);
  const searchRef = useRef(null);
  const popupRef = useRef(null);
  const highlightSourceRef = useRef('programmatic');

  const close = useCallback(({ restoreFocus = true } = {}) => {
    const select = activeSelect;
    if (select) {
      select.removeAttribute('data-searchable-open');
      select.setAttribute('aria-expanded', 'false');
    }
    setActiveSelect(null);
    setQuery('');
    setPosition(null);
    highlightSourceRef.current = 'programmatic';
    setHighlighted(0);
    if (restoreFocus && select?.isConnected) {
      window.setTimeout(() => select.focus({ preventScroll: true }), 0);
    }
  }, [activeSelect]);

  const open = useCallback((select, initialQuery = '') => {
    if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;

    if (activeSelect && activeSelect !== select) {
      activeSelect.removeAttribute('data-searchable-open');
      activeSelect.setAttribute('aria-expanded', 'false');
    }

    select.setAttribute('data-searchable-open', 'true');
    select.setAttribute('aria-expanded', 'true');
    setActiveSelect(select);
    setQuery(initialQuery);
    setRevision((current) => current + 1);
    setPosition(getPopupPosition(select));
    highlightSourceRef.current = 'programmatic';
    setHighlighted(0);
  }, [activeSelect]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const select = event.target?.closest?.('select');
      if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
      event.preventDefault();
      event.stopPropagation();
      open(select);
    };

    const onKeyDown = (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

      const printable = event.key.length === 1;
      if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key) && !printable) return;

      event.preventDefault();
      const initialQuery = printable && event.key !== ' ' ? event.key : '';
      open(select, initialQuery);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!activeSelect) return undefined;

    const refresh = () => {
      if (!activeSelect.isConnected) {
        close({ restoreFocus: false });
        return;
      }
      setPosition(getPopupPosition(activeSelect));
      setRevision((current) => current + 1);
    };

    const onOutsidePointerDown = (event) => {
      if (popupRef.current?.contains(event.target) || activeSelect.contains(event.target)) return;
      close({ restoreFocus: false });
    };
    const onDocumentKeyDown = (event) => {
      if (event.key === 'Escape') close({ restoreFocus: false });
    };

    const observer = new MutationObserver(() => setRevision((current) => current + 1));
    observer.observe(activeSelect, { childList: true, subtree: true, attributes: true });

    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [activeSelect, close]);

  useEffect(() => {
    if (!activeSelect) return;
    const id = window.requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
      searchRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeSelect]);

  const options = useMemo(() => {
    if (!activeSelect) return [];
    return getOptions(activeSelect);
    // revision tracks native option/value changes that do not replace the node.
  }, [activeSelect, revision]);

  const filteredOptions = useMemo(() => {
    const visible = options.filter((option) => matchesSearch(option.label, query));
    if (!query) return visible;
    const normalizedQuery = normalize(query);
    return visible.sort((a, b) => {
      const aLabel = normalize(a.label);
      const bLabel = normalize(b.label);
      const aExact = aLabel === normalizedQuery ? 0 : aLabel.startsWith(normalizedQuery) ? 1 : 2;
      const bExact = bLabel === normalizedQuery ? 0 : bLabel.startsWith(normalizedQuery) ? 1 : 2;
      return aExact - bExact || a.index - b.index;
    });
  }, [options, query]);

  useEffect(() => {
    if (!filteredOptions.length) {
      highlightSourceRef.current = 'programmatic';
      setHighlighted(-1);
      return;
    }
    const selectedIndex = filteredOptions.findIndex((option) => option.selected && !option.disabled);
    highlightSourceRef.current = 'programmatic';
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredOptions]);

  const choose = useCallback((option) => {
    if (!activeSelect || !option || option.disabled) return;
    activeSelect.value = option.value;
    activeSelect.dispatchEvent(new Event('input', { bubbles: true }));
    activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }, [activeSelect, close]);

  const onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!filteredOptions.length) return;
      highlightSourceRef.current = 'keyboard';
      setHighlighted((current) => (current + 1 + filteredOptions.length) % filteredOptions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filteredOptions.length) return;
      highlightSourceRef.current = 'keyboard';
      setHighlighted((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(filteredOptions[highlighted]);
    }
  };

  useEffect(() => {
    // Important: options move beneath a stationary cursor while the user scrolls.
    // Mouse hover must never fight the user's wheel/trackpad position.
    if (highlighted < 0 || highlightSourceRef.current !== 'keyboard') return;
    popupRef.current?.querySelector(`[data-option-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  if (!activeSelect || !position || typeof document === 'undefined') return null;

  const selected = options.find((option) => option.selected);

  return createPortal(
    <>
      <div
        ref={popupRef}
        className="go-searchable-select"
        role="dialog"
        aria-label="Buscar opción"
        style={position}
      >
        <div className="go-searchable-select__search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Escriba para buscar..."
            aria-label="Buscar en la lista"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <X size={15} />
            </button>
          ) : null}
        </div>

        <div className="go-searchable-select__meta">
          <span>{query ? `${filteredOptions.length} coincidencia${filteredOptions.length === 1 ? '' : 's'}` : `${options.length} opciones`}</span>
          {selected?.label ? <span className="go-searchable-select__current">Actual: {selected.label}</span> : null}
        </div>

        <div className="go-searchable-select__options" role="listbox">
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              key={`${option.value}-${option.index}`}
              type="button"
              role="option"
              aria-selected={option.selected}
              disabled={option.disabled}
              data-option-index={index}
              className={`go-searchable-select__option${index === highlighted ? ' is-highlighted' : ''}${option.selected ? ' is-selected' : ''}`}
              onMouseEnter={() => {
                highlightSourceRef.current = 'pointer';
                setHighlighted(index);
              }}
              onClick={() => choose(option)}
            >
              <span>{option.label || '—'}</span>
              {option.selected ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          )) : (
            <div className="go-searchable-select__empty">
              <Search size={18} aria-hidden="true" />
              <strong>Sin coincidencias</strong>
              <span>Pruebe con otra parte del nombre, código o referencia.</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .go-searchable-select {
          position: fixed;
          z-index: 2147483000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #3a3e45;
          border-radius: 10px;
          background: #17191c;
          box-shadow: 0 18px 48px rgba(0, 0, 0, .42), 0 0 0 1px rgba(255,255,255,.025);
          color: #eceef1;
        }
        .go-searchable-select__search {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 44px;
          padding: 7px 9px 7px 12px;
          border-bottom: 1px solid #2b2f35;
          background: #111315;
          color: #949aa3;
        }
        .go-searchable-select__search:focus-within {
          box-shadow: inset 0 -1px 0 #f02b32;
          color: #c9cdd2;
        }
        .go-searchable-select__search input {
          min-width: 0;
          flex: 1;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #f4f5f6 !important;
          font: inherit;
          font-size: 13px;
        }
        .go-searchable-select__search input::placeholder { color: #737982; }
        .go-searchable-select__search button {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #858b94;
          cursor: pointer;
        }
        .go-searchable-select__search button:hover { background: #272a2f; color: #fff; }
        .go-searchable-select__meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 11px;
          border-bottom: 1px solid #25282d;
          background: #191b1f;
          color: #7f858e;
          font-size: 10px;
          line-height: 1.3;
        }
        .go-searchable-select__current {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .go-searchable-select__options {
          min-height: 0;
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 5px;
        }
        .go-searchable-select__option {
          display: flex;
          width: 100%;
          min-height: 38px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #cdd1d6;
          text-align: left;
          font: inherit;
          font-size: 12px;
          line-height: 1.35;
          cursor: pointer;
        }
        .go-searchable-select__option span {
          overflow-wrap: anywhere;
        }
        .go-searchable-select__option:hover,
        .go-searchable-select__option.is-highlighted {
          background: #25282d;
          color: #fff;
        }
        .go-searchable-select__option.is-selected {
          color: #fff;
          font-weight: 650;
        }
        .go-searchable-select__option.is-selected svg { color: #ef2b33; flex: 0 0 auto; }
        .go-searchable-select__option:disabled {
          opacity: .4;
          cursor: not-allowed;
        }
        .go-searchable-select__empty {
          display: grid;
          min-height: 118px;
          place-items: center;
          align-content: center;
          gap: 5px;
          padding: 18px;
          color: #747a83;
          text-align: center;
        }
        .go-searchable-select__empty strong { color: #b9bec5; font-size: 12px; }
        .go-searchable-select__empty span { max-width: 260px; font-size: 10px; line-height: 1.4; }
        select[data-searchable-open="true"] {
          outline: 2px solid rgba(239, 43, 50, .65) !important;
          outline-offset: 1px;
        }
        @media (max-width: 640px) {
          .go-searchable-select {
            left: 10px !important;
            right: 10px !important;
            bottom: 10px !important;
            top: auto !important;
            width: auto !important;
            max-height: min(62vh, 480px) !important;
            border-radius: 12px;
          }
          .go-searchable-select__search { min-height: 50px; }
          .go-searchable-select__option { min-height: 44px; font-size: 13px; }
        }
      `}</style>
    </>,
    document.body,
  );
}
