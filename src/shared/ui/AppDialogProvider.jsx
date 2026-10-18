import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, MessageSquareText } from 'lucide-react';
import Modal from './Modal';

let dialogHandler = null;

function requestDialog(config) {
  if (!dialogHandler) {
    console.warn('AppDialogProvider no está disponible.', config);
    if (config.type === 'confirm') return Promise.resolve(false);
    if (config.type === 'prompt') return Promise.resolve(null);
    return Promise.resolve(undefined);
  }
  return dialogHandler(config);
}

function inferAlertPresentation(message) {
  const text = String(message || '');
  if (/exitos|preparado|completad|guardad/i.test(text)) return { tone: 'success', title: 'Acción completada' };
  if (/error|no se pudo|no tienes|no se encontr|obligatori|vac[ií]o/i.test(text)) return { tone: 'danger', title: 'No se pudo continuar' };
  return { tone: 'info', title: 'Aviso' };
}

function inferConfirmTone(message) {
  return /eliminar|desactivar|revocar|bloquear|cancelar|invalidar|revertir|reemplazar/i.test(String(message || ''))
    ? 'danger'
    : 'warning';
}

export const appDialog = {
  alert(message, options = {}) {
    return requestDialog({ type: 'alert', message, ...inferAlertPresentation(message), ...options });
  },
  confirm(message, options = {}) {
    return requestDialog({ type: 'confirm', message, tone: inferConfirmTone(message), ...options });
  },
  prompt(message, defaultValue = '', options = {}) {
    const requiresValue = /motivo|raz[oó]n|indique/i.test(String(message || ''));
    return requestDialog({
      type: 'prompt',
      message,
      defaultValue,
      required: requiresValue,
      tone: requiresValue ? 'warning' : 'info',
      ...options,
    });
  },
};

const DEFAULTS = {
  alert: {
    title: 'Aviso',
    confirmLabel: 'Entendido',
    tone: 'info',
  },
  confirm: {
    title: 'Confirmar acción',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    tone: 'warning',
  },
  prompt: {
    title: 'Información requerida',
    confirmLabel: 'Continuar',
    cancelLabel: 'Cancelar',
    tone: 'info',
  },
};

function DialogIcon({ type, tone }) {
  if (tone === 'danger' || tone === 'warning') return <AlertTriangle size={22} />;
  if (tone === 'success') return <CheckCircle2 size={22} />;
  if (type === 'prompt') return <MessageSquareText size={22} />;
  return <Info size={22} />;
}

export default function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const resolverRef = useRef(null);

  const openDialog = useCallback((config) => new Promise((resolve) => {
    const defaults = DEFAULTS[config.type] || DEFAULTS.alert;
    resolverRef.current = resolve;
    setInputValue(String(config.defaultValue ?? ''));
    setDialog({ ...defaults, ...config });
  }), []);

  useEffect(() => {
    dialogHandler = openDialog;
    return () => {
      if (dialogHandler === openDialog) dialogHandler = null;
    };
  }, [openDialog]);

  const close = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(value);
  }, []);

  const cancel = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') close(false);
    else if (dialog.type === 'prompt') close(null);
    else close(undefined);
  }, [close, dialog]);

  const accept = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') close(true);
    else if (dialog.type === 'prompt') close(inputValue);
    else close(undefined);
  }, [close, dialog, inputValue]);

  const isPrompt = dialog?.type === 'prompt';
  const isAlert = dialog?.type === 'alert';
  const dangerous = dialog?.tone === 'danger';

  return (
    <>
      {children}
      <Modal
        open={Boolean(dialog)}
        onClose={cancel}
        closeOnBackdrop={!dialog?.disableBackdropClose}
        title={dialog?.title || 'Aviso'}
        size="sm"
        footer={dialog ? (
          <>
            {!isAlert ? (
              <button type="button" className="go-button" onClick={cancel}>
                {dialog.cancelLabel || 'Cancelar'}
              </button>
            ) : null}
            <button
              type="button"
              className={dangerous ? 'go-button go-dialog-danger-button' : 'go-button-primary'}
              onClick={accept}
              disabled={isPrompt && dialog.required && !inputValue.trim()}
              autoFocus
            >
              {dialog.confirmLabel || 'Aceptar'}
            </button>
          </>
        ) : null}
      >
        {dialog ? (
          <div className={`go-app-dialog go-app-dialog--${dialog.tone || 'info'}`}>
            <div className="go-app-dialog-icon" aria-hidden="true">
              <DialogIcon type={dialog.type} tone={dialog.tone} />
            </div>
            <div className="go-app-dialog-content">
              <p className="go-app-dialog-message">{dialog.message}</p>
              {dialog.description ? <p className="go-app-dialog-description">{dialog.description}</p> : null}
              {isPrompt ? (
                dialog.multiline === false ? (
                  <input
                    className="go-control go-app-dialog-input"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={dialog.placeholder || ''}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !(dialog.required && !inputValue.trim())) accept();
                    }}
                    autoFocus
                  />
                ) : (
                  <textarea
                    className="go-control go-app-dialog-input go-app-dialog-textarea"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={dialog.placeholder || ''}
                    rows={4}
                    autoFocus
                  />
                )
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
