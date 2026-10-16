import { useEffect } from 'react';

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

/**
 * Extiende todos los selectores nativos con búsqueda progresiva completa.
 * No cambia su HTML ni su contrato con React: solo selecciona y emite el
 * evento `change` que ya consumen los formularios existentes.
 */
export default function NativeSelectSearch() {
  useEffect(() => {
    const queries = new WeakMap();
    const resetAfterMs = 2200;

    const clearQuery = (select) => {
      queries.delete(select);
      select.removeAttribute('data-search-query');
      select.removeAttribute('title');
    };

    const findMatch = (select, query) => Array.from(select.options).find((option) => (
      !option.disabled && normalize(option.textContent).includes(query)
    ));

    const onKeyDown = (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

      if (event.key === 'Escape') {
        clearQuery(select);
        return;
      }
      if (event.key !== 'Backspace' && event.key.length !== 1) return;

      const previous = queries.get(select);
      const expired = !previous || Date.now() - previous.updatedAt > resetAfterMs;
      const nextQuery = normalize(
        event.key === 'Backspace'
          ? (expired ? '' : previous.query.slice(0, -1))
          : `${expired ? '' : previous.query}${event.key}`,
      );

      event.preventDefault();
      if (!nextQuery) {
        clearQuery(select);
        return;
      }

      queries.set(select, { query: nextQuery, updatedAt: Date.now() });
      select.dataset.searchQuery = nextQuery;
      select.title = `Buscando: ${nextQuery}`;

      const match = findMatch(select, nextQuery);
      if (!match || select.value === match.value) return;
      select.value = match.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const onBlur = (event) => {
      if (event.target instanceof HTMLSelectElement) clearQuery(event.target);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusout', onBlur, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusout', onBlur, true);
    };
  }, []);

  return null;
}
