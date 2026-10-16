import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  size = 'md',
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: '520px',
    md: '640px',
    lg: '860px',
    xl: '1080px',
  };

  return (
    <div
      className="go-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="go-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Diálogo'}
        style={{ maxWidth: widths[size] || widths.md }}
      >
        <header className="go-modal-header">
          <h2 className="go-modal-title">{title}</h2>
          <button type="button" className="go-button !min-h-9 !w-9 !p-0" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="go-modal-body">{children}</div>
        {footer ? <footer className="go-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
