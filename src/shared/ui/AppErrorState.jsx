import { AlertTriangle, Lock, RefreshCw, WifiOff } from 'lucide-react';

import { getErrorPresentation } from '@shared/utils/errors';

const iconByKind = { unavailable: Lock, network: WifiOff, default: AlertTriangle };

export default function AppErrorState({ error, fallback, onRetry }) {
  const presentation = getErrorPresentation(error, fallback);
  const Icon = iconByKind[presentation.kind] || iconByKind.default;

  return (
    <section className="go-error-state" role="alert" aria-live="assertive">
      <div className={`go-error-state-icon go-error-state-icon--${presentation.kind}`}><Icon size={26} /></div>
      <h1>{presentation.title}</h1>
      <p>{presentation.message}</p>
      <div className="go-error-state-actions">
        {presentation.retryable && onRetry ? <button type="button" className="go-primary" onClick={onRetry}><RefreshCw size={16} /> Reintentar</button> : null}
      </div>
    </section>
  );
}
